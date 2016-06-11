 //-----------------------------BEGIN EMAILER------------------------------------
var nodemailer = require('nodemailer');
var xoauth2 = require('xoauth2');

// login
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        xoauth2: xoauth2.createXOAuth2Generator({
            user: 'dupreez.s.m@gmail.com',
            clientId: '284650560330-hfv1l1rkoea5tc1o0jjh87p5i2baotvl.apps.googleusercontent.com',
            clientSecret: 'NV00Nk5sxzPxbk8M2yE3aUyJ',
            refreshToken: '1/3awO-BiuqbJcOmR3a1ckcyFn-waisIf4E6T3XRpQpD4',
            accessToken: 'ya29.CjHQAtV5PxyOKjcwXOLCrNwkZhiV56S0TS55P5mzskY7FKXss7jEYLKS5BfSXX_ZIfBW'
        })
    }
});


var Firebase = require("firebase");
var myFirebaseRef = new Firebase("https://emissary.firebaseio.com/");

var emailMessage;

myFirebaseRef.child("urgent_messages").on("child_added", function(snapshot) {
    console.log("New Urgent Message");
    var urgentMessage = snapshot.val();

    deliveryId = urgentMessage.deliveryId;
    message = urgentMessage.message;
    userId = urgentMessage.userId;

    emailMessage = "Delivery ID: " + deliveryId + "\n";
    emailMessage = emailMessage + "User ID: " + userId + "\n";
    emailMessage = emailMessage + "Message: " + message + "\n";

    something = JSON.stringify();
    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: '"EmissaryAdmin" <dupreez.s.m@gmail.com>', // sender address
        to: 'dupreez.s.m@gmail.com', // list of receivers
        subject: 'EMISSARY - New Urgent Message', // Subject line
        text: emailMessage, // plaintext body
    };
    console.log("Sending Mail");
    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);
    });
});
//-----------------------------END EMAILER--------------------------------------




//-----------------------------BEGIN DATABASE TIDY------------------------------
myFirebaseRef.child("deliveries_active").orderByChild("status").equalTo(400).on("child_added", function(snapshot) {
    //Move pickup locaiton to unlisted
    moveFbRecord(
        myFirebaseRef.child("delivery_geofire").child("dropoff_location").child(snapshot.key()),
        myFirebaseRef.child("delivery_geofire_unlisted").child("dropoff_location").child(snapshot.key())
    );

    //Move dropoff locaiton to unlisted
    moveFbRecord(
        myFirebaseRef.child("delivery_geofire").child("pickup_location").child(snapshot.key()),
        myFirebaseRef.child("delivery_geofire_unlisted").child("pickup_location").child(snapshot.key())
    );

    //Move main delivery to unlisted
    moveFbRecord(
        myFirebaseRef.child("deliveries_active").child(snapshot.key()),
        myFirebaseRef.child("deliveries_unlisted").child(snapshot.key())
    );
});
//-----------------------------END DATABASE TIDY--------------------------------

//-----------------------------BEGIN DISTANCE ADD-------------------------------
var GeoFire = require("geofire");

myFirebaseRef.child("deliveries_pending").on("child_added", function(snapshot) {
    var deliveryId = snapshot.key();
    var delivery = snapshot.val();

    var pickupLat = delivery.pickupLat;
    var pickupLong = delivery.pickupLong;
    var dropoffLat = delivery.dropoffLat;
    var dropoffLong = delivery.dropoffLong;

    url = 'https://maps.googleapis.com/maps/api/distancematrix/json?origins='
    url = url + pickupLat + ',' + pickupLong
    url = url + '&destinations='
    url = url + dropoffLat + ',' + dropoffLong
    url = url + '&key=AIzaSyD4cX8sE_NtzJJg3hd48zYXmt9K732uCnM'

    var request = require('request');
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var json = JSON.parse(body);
        var distance = (json.rows[0].elements[0].distance.value / 1000.0)

        myFirebaseRef.child("deliveries_pending").child(snapshot.key()).child("distance").set(distance);
        moveFbRecord(
          myFirebaseRef.child("deliveries_pending").child(snapshot.key()),
          myFirebaseRef.child("deliveries_active").child(snapshot.key())
        );
      }
    });
});
//-----------------------------END DISTANCE ADD---------------------------------


//-----------------------------BEGIN HELPER FUNCTIONS---------------------------
function moveFbRecord(oldRef, newRef) {
     oldRef.once("value", function(snap)  {
          newRef.set( snap.val(), function(error) {
               if( !error ) {  oldRef.remove(); }
               else if( typeof(console) !== 'undefined' && console.error ) {  console.error(error); }
          });
     });
}
//-----------------------------END HELPER FUNCTIONS-----------------------------
