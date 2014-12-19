# Cats of Instagram

This application shows cat pictures from Instagram in real time. It is built on top of RethinkDB and Instagram's PubSubHubbub API. When you start the application, it will subscribe to Instagram's `#catsofinstagram` tag. Instagram will send POST requests to your application every time a new image is posted with the tag.

In order to receive the POST requests from Instagram, you must run the application at a publicly accessible address and specify the public host in the `config.js` file. For development purposes, it is generally most convenient to use something like [ngrok](https://ngrok.com/) to expose a locally-running instance of the application to the public Internet.

The application uses RethinkDB change feeds to identify newly-added cats and then uses WebSockets to propagate cat information to the application frontend. For more details about how the application works, you can read the [CatThink tutorial](http://rethinkdb.com/blog/cats-of-instagram/) on the RethinkDB website.
