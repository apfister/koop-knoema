## koop-knoema provider
Register datasets from a Knoema datasource as a Koop provider

### Getting Started
- `git clone` this repo
- `npm install`
- create a `development.json` file under the `config` folder
- [sign up for a knoema account](https://knoema.com/sys/login/signup)
  - create an app that will give you a Client ID and a Client Secret
  - in your `config/development.json` add in your client id and client secret:
  ```
    { 
      "client_id": <your client id here>,
      "client_secret": <your client secret here>
    }
  ```
- `npm start`
- your server is now available at `http://localhost:3000/knoema`

### (optional) Deploy to Heroku
- create a `custom-enviornment-variables.json` in your `config` folder
- in `custom-enviornment-variables.json`, add:
  ```
    {
      "client_id": "CLIENT_ID",
      "client_secret": "CLIENT_SECRET"
    }
  ```
- [sign up](https://signup.heroku.com/) for a free Heroku account if you need one
- create a [Heroku NodeJS App](https://devcenter.heroku.com/articles/getting-started-with-nodejs#introduction)
- go to the Heroku Dashboard for your newly created app, and set the [Config Variables](https://devcenter.heroku.com/articles/config-vars#using-the-heroku-dashboard) for `CLIENT_ID` and `CLIENT_SECRET`. 
  - set the values of these using your Knoema Client ID and Client Secret
- follow the rest of the instructions for [deploying your app to Heroku](https://devcenter.heroku.com/articles/getting-started-with-nodejs#push-local-changes)


### Using the Koop Provider
The URL structure to use Knoema datasets as a FeatureServer will be:

`http://<yourServerName>/knoema/<knoemaDatasetId>/<knoemaDatasetIndicatorKey>/FeatureServer/0`

This provider will also give you a helper endpoint to list out available datasets:

`http://<yourServerName>/knoema/datasets/`

Then you can get more detail for a specific dataset:

`http://<yourServerName>/knoema/datasets/<knoemaDatasetId>`

This response will include `dimensions` where you can copy/paste the `key` to serve as the `<knoemaDatasetIndicatorKey>` referenced above

A final example would look like this:

`https://<yourServerName>/knoema/bbkawjf/1000420/FeatureServer/0`

You can now use that URL in a variety of ArcGIS Online applications