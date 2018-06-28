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

### URL Structure for Feature Service
