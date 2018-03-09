# TOPCODER EMAIL SERIES - EMAIL SERVER 


## Dependencies
- nodejs https://nodejs.org/en/ (v8+)
- Heroku Toolbelt https://toolbelt.heroku.com
- git
- PostgreSQL 9.5


## Configuration
Configuration for the notification server is at `config/default.js`.
The following parameters can be set in config files or in env variables:
- LOG_LEVEL: the log level
- PORT: the notification server port
- authSecret: TC auth secret
- authDomain: TC auth domain
- validIssuers: TC auth valid issuers
- jwksUri: TC auth JWKS URI
- DATABASE_URL: URI to PostgreSQL database
- DATABASE_OPTIONS: database connection options
- KAFKA_URL: comma separated Kafka hosts
- KAFKA_TOPIC_IGNORE_PREFIX: ignore this prefix for topics in the Kafka
- KAFKA_GROUP_ID: Kafka consumer group id
- KAFKA_CLIENT_CERT: Kafka connection certificate, optional;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to certificate file or certificate content
- KAFKA_CLIENT_CERT_KEY: Kafka connection private key, optional;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to private key file or private key content
- TEMPLATE_MAP: the map between topic and SendGrid template id


Configuration for the connect notification server is at `connect/config.js`.
The following parameters can be set in config files or in env variables:
- TEMPLATE_MAP: the map between topic and SendGrid template id
- SUBJECT_MAP: the map between topic and SendGrid email subject
- EMAIL_FROM: from email to use to send email with SendGrid
- SENDGRID_API_KEY: SendGrid API key


Note that the above two configuration are separate because the common notification server config
will be deployed to a NPM package, the connect notification server will use that NPM package,
the connection notification server should only use API exposed by the index.js.

## TC API Admin Token

An admin token is needed to access TC API. This is already configured Postman notification
server API environment TC_ADMIN_TOKEN variable.
In case it expires, you may get a new token in this way:

- use Chrome to browse connect.topcoder-dev.com
- open developer tools, click the Network tab
- log in with suser1 / Topcoder123, or mess / appirio123
- once logged in, open some project, for example https://connect.topcoder-dev.com/projects/1936 and in the network inspector
  look for the call to the project api and get the token from the auth header, see
  http://pokit.org/get/img/68cdd34f3d205d6d9bd8bddb07bdc216.jpg


## Local deployment
- for local development environment you can set variables as following:
  - `authSecret`, `authDomain`, `validIssuers` can get from [tc-project-service config](https://github.com/topcoder-platform/tc-project-service/blob/dev/config/default.json)
  - `PORT=4001` because **connect-app** call this port by default
  - `jwksUri` - any
  - `KAFKA_TOPIC_IGNORE_PREFIX=joan-26673.` (with point at the end)
  - `KAFKA_URL`, `KAFKA_CLIENT_CERT` and `KAFKA_CLIENT_CERT_KEY` get from [tc-bus-api readme](https://github.com/topcoder-platform/tc-bus-api/tree/dev)
- start local PostgreSQL db, create an empty database, update the config/default.js DATABASE_URL param to point to the db
- install dependencies `npm i`
- run code lint check `npm run lint`
- start connect notification server `npm start`
- the app is running at `http://localhost:4001`, it also starts Kafka consumer to listen for events, send emails using SendGrid and save emails data to database


## Heroku deployment

- git init
- git add .
- git commit -m 'message'
- heroku login
- heroku create [application-name] // choose a name, or leave it empty to use generated one
- heroku addons:create heroku-postgresql:hobby-dev
- note that you may need to wait for several minutes before the PostgreSQL database is ready
- optionally, to set some environment variables in heroku, run command like:
  `heroku config:set KAFKA_CLIENT_CERT=path/to/certificate/file`
  `heroku config:set KAFKA_CLIENT_CERT_KEY=path/to/private/key/file`
  `heroku config:set KAFKA_GROUP_ID=some-group`
  etc.
- git push heroku master // push code to Heroku


## Verification

- start the app following above sections
- Import `docs/tc-email-server-api-local-env.postman_environment.json` and `docs/tc-email-server-api.postman_collection.json` to Postman
- in Postman, using the email server API collection and environment to run the tests


## Swagger

Swagger API definition is provided at `docs/swagger_api.yaml`,
you may check it at `http://editor.swagger.io`.
