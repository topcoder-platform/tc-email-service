# Builds production version of Community App inside Docker container,
# and runs it against the specified Topcoder backend (development or
# production) when container is executed.

FROM node:6.17.0
LABEL app="tc email" version="1.1"

WORKDIR /opt/app
COPY . .
RUN npm install
#RUN npm install dotenv --save
RUN npm run lint
CMD ["npm", "start"]
