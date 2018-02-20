#!/bin/bash
set -eo pipefail

# more bash-friendly output for jq
JQ="jq --raw-output --exit-status"

ENV=$1
TAG=$2
PROVIDER=$3
COUNTER_LIMIT=20
# Counter limit will be caluculaed based on sleep seconds

if [[ -z "$ENV" ]] ; then
	echo "Environment should be set on startup with one of the below values"
	echo "ENV must be one of - DEV, QA, PROD or LOCAL"
	exit
fi
if [[ -z "$TAG" ]] ; then
	echo "TAG must be specificed for image"
	exit
fi
if [[ -z "$PROVIDER" ]] ; then
	PROVIDER=$ENV
fi

AWS_REGION=$(eval "echo \$${ENV}_AWS_REGION")
AWS_ACCESS_KEY_ID=$(eval "echo \$${ENV}_AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY=$(eval "echo \$${ENV}_AWS_SECRET_ACCESS_KEY")
AWS_ACCOUNT_ID=$(eval "echo \$${ENV}_AWS_ACCOUNT_ID")
AWS_REPOSITORY=$(eval "echo \$${ENV}_AWS_REPOSITORY")
AWS_ECS_CLUSTER=$(eval "echo \$${ENV}_AWS_ECS_CLUSTER")
AWS_ECS_SERVICE=$(eval "echo \$${ENV}_AWS_ECS_SERVICE")
family=$(eval "echo \$${ENV}_AWS_ECS_TASK_FAMILY")
AWS_ECS_CONTAINER_NAME=$(eval "echo \$${ENV}_AWS_ECS_CONTAINER_NAME")


AUTH_DOMAIN=$(eval "echo \$${ENV}_AUTHDOMAIN")
AUTH_SECRET=$(eval "echo \$${ENV}_AUTHSECRET")
VALID_ISSUERS=$(eval "echo \$${ENV}_VALIDISSUERS")

KAFKA_CLIENT_CERT=$(eval "echo \$${ENV}_KAFKA_CLIENT_CERT")
KAFKA_CLIENT_CERT_KEY=$(eval "echo \$${ENV}_KAFKA_CLIENT_CERT_KEY")
KAFKA_URL=$(eval "echo \$${ENV}_KAFKA_URL")
SENDGRID_API_KEY=$(eval "echo \$${ENV}_SENDGRID_API_KEY")


DB_DATABASE=$(eval "echo \$${ENV}_DB_DATABASE")
DB_HOST=$(eval "echo \$${ENV}_DB_HOST")
DB_PASSWORD=$(eval "echo \$${ENV}_DB_PASSWORD")
DB_PORT=$(eval "echo \$${ENV}_DB_PORT")
DB_USER=$(eval "echo \$${ENV}_DB_USER")
DATABASE_URL=postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_DATABASE;

# following can have in config file 

KAFKA_GROUP_ID=$(eval "echo \$${ENV}_KAFKA_GROUP_ID")
EMAIL_FROM=$(eval "echo \$${ENV}_EMAIL_FROM")
LOG_LEVEL=$(eval "echo \$${ENV}_LOG_LEVEL")
NODE_ENV=$(eval "echo \$${ENV}_NODE_ENV")
PORT=$(eval "echo \$${ENV}_NODE_PORT")
JWKS_URI=$(eval "echo \$${ENV}_JWKSURI")
TEMPLATE_MAP=$(eval "echo \$${ENV}_TEMPLATE_MAP")

configure_aws_cli() {
	aws --version
	aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
	aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY
	aws configure set default.region $AWS_REGION
	aws configure set default.output json
	echo "Configured AWS CLI."
}

push_ecr_image() {
	echo "Pushing Docker Image...."
	eval $(aws ecr get-login --region $AWS_REGION --no-include-email)
	docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$AWS_REPOSITORY:$TAG
	echo "Docker Image published."

}

deploy_cluster() {

    make_task_def
    register_definition
    update_result=$(aws ecs update-service --cluster $AWS_ECS_CLUSTER --service $AWS_ECS_SERVICE --task-definition $revision )
    result=$(echo $update_result | $JQ '.service.taskDefinition' )
    echo $result
    if [[ $result != $revision ]]; then
        echo "Error updating service."
        return 1
    fi

    echo "Update service intialised successfully for deployment"
    return 0
}

make_task_def(){
	task_template='{
   "family": "%s"
   "requiresCompatibilities": ["EC2", "FARGATE"],
   "networkMode": "awsvpc",
   "executionRoleArn": "arn:aws:iam::%s:role/ecsTaskExecutionRole",
   "cpu": "1024",
   "memory": "2048",
   "containerDefinitions": [{
      "name": "%s",
      "memory": 1000,
      "cpu" : 0,
      "image": "%s.dkr.ecr.%s.amazonaws.com/%s:%s",
      "environment": [
        {
          "name" : "ENV",
          "value" : "%s"
        },
        {
          "name": "authDomain",
          "value": "%s"
        },
        {
          "name": "authSecret",
          "value": "%s"
        },
        {
          "name": "DATABASE_URL",
          "value": "%s"
        },
        {
          "name": "EMAIL_FROM",
          "value": "%s"
        },
        {
          "name": "jwksUri",
          "value": "%s"
        },
        {
          "name": "KAFKA_CLIENT_CERT",
          "value": "%s"
        },
        {
          "name": "KAFKA_CLIENT_CERT_KEY",
          "value": "%s"
        },
        {
          "name": "KAFKA_GROUP_ID",
          "value": "%s"
        },
        {
          "name": "KAFKA_URL",
          "value": "%s"
        },
        {
          "name": "LOG_LEVEL",
          "value": "%s"
        },
        {
          "name": "PORT",
          "value": "%s"
        },
        {
          "name": "SENDGRID_API_KEY",
          "value": "%s"
        },
        {
          "name": "TEMPLATE_MAP",
          "value": "%s"
        },
        {
          "name": "validIssuers",
          "value": "%s"
        }
      ],
      "portMappings": [
        {
          "hostPort": %s,
          "protocol": "tcp",
          "containerPort": %s
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/aws/ecs/%s",
          "awslogs-region": "%s",
          "awslogs-stream-prefix": "%s"
        }
      }
    }
  ]
  }'
	
  task_def=$(printf "$task_template" $family $AWS_ACCOUNT_ID $AWS_ECS_CONTAINER_NAME $AWS_ACCOUNT_ID $AWS_REGION $AWS_REPOSITORY $TAG $ENV $AUTH_DOMAIN $AUTH_SECRET $DATABASE_URL $EMAIL_FROM "$JWKS_URI" "$KAFKA_CLIENT_CERT" "$KAFKA_CLIENT_CERT_KEY" $KAFKA_GROUP_ID $KAFKA_URL $LOG_LEVEL $PORT $SENDGRID_API_KEY "$TEMPLATE_MAP" "$VALID_ISSUERS" $PORT $PORT $AWS_ECS_CLUSTER $AWS_REGION $ENV)

}

register_definition() {
    if revision=$(aws ecs register-task-definition --cli-input-json "$task_def" | $JQ '.taskDefinition.taskDefinitionArn'); then
        echo "Revision: $revision"
    else
        echo "Failed to register task definition"
        return 1
    fi

}

check_service_status() {
        counter=0
	sleep 60
        servicestatus=`aws ecs describe-services --service $AWS_ECS_SERVICE --cluster $AWS_ECS_CLUSTER | $JQ '.services[].events[0].message'`
        while [[ $servicestatus != *"steady state"* ]]
        do
           echo "Current event message : $servicestatus"
           echo "Waiting for 30 sec to check the service status...."
           sleep 30
           servicestatus=`aws ecs describe-services --service $AWS_ECS_SERVICE --cluster $AWS_ECS_CLUSTER | $JQ '.services[].events[0].message'`
           counter=`expr $counter + 1`
           if [[ $counter -gt $COUNTER_LIMIT ]] ; then
                echo "Service does not reach steady state with in 10 minutes. Please check"
                exit 1
           fi
        done
        echo "$servicestatus"
}

configure_aws_cli
push_ecr_image
deploy_cluster
check_service_status

