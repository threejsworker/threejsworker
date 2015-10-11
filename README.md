###ThreejsWorker

This checks if there are any pullrequest updates on the three.js repository and if their are any changes, rebuild the three.js build and show it on the website.

## requirements

 - [Node.js 4.0](https://nodejs.org/en/) & NPM (comes with node.js)
 - [A github authenication token](https://github.com/settings/tokens) (needed in config.js file)

## How to setup 

 - git clone https://github.com/threejsworker/threejsworker.git
 - cd threejsworker
 - npm install
 - Create a config.js file with following contents:
```javascript
      module.exports = {
          "GITHUB_TOKEN": A_GITHUB_AUTHNETICATION_TOKEN, // get a token from https://github.com/settings/tokens 
          "SINGLE_PROCESS": true
      }
```
  - node server.js
  
This is all that's needed to start

## Configuration

The config.js file contains all configuration nessecary.

- SINGLE_PROCESS

 Start the jobs together with the server. That way, the jobs don't need to be started by them self.
 
 Current jobs are: 
 - [githubdatafetch](https://github.com/threejsworker/threejsworker/blob/master/lib/jobs/githubdatafetch.js)
