/*
 * GET users listing.
 */

var sqlQuery = "SELECT * FROM mainsigns WHERE acos(sin(? * 0.0175) * sin(latitude * 0.0175) + cos(? * 0.0175) * cos(latitude * 0.0175) * cos(longitude * 0.0175 - (? * 0.0175))) * 6371 <= 30";

exports.list_signs = function(req, res){

  req.getConnection(function(err,connection){

  	var data_latitude = 41.5624;
	var data_longitude = -8.39234;
       
    var query = connection.query(sqlQuery, [data_latitude, data_latitude, data_longitude], function(err,rows)
    {
        
        if(err)
            console.log("Error Selecting : %s ",err );
 
        res.render('signs',{page_title:"TRAFFIC SIGNS - Node.js",data:rows});
            
    });

  });
  
};

var crg = require('city-reverse-geocoder');

/*****************************************************
 *                   Update Policy 1                 *
 *****************************************************/

function updatePolicy_1(connection, data, res){

	var results;

	var data_latitude = data[0].latitude;
	var data_longitude = data[0].longitude;

    var select = connection.query(sqlQuery, [data_latitude, data_latitude, data_longitude], function(err,rows)
    {
        
        if(err)
            console.log("Error Selecting : %s ",err );

        results = JSON.stringify(rows);

        results = JSON.parse(results);

        console.log(results.length);

        insertOrUpdate(connection, data, results, res);

        res.redirect('/');
       
    });

}

/*****************************************************
 *           Update sign coordinates by ID           *  
 *****************************************************/

function updateSign(connection, lat, lng, id, bool){
	var sqlQuery;
	if(true){
		sqlQuery = "UPDATE mainsigns set latitude=?,longitude=?,"+
		"reportCount = reportCount + 1, confidenceLevel = confidenceLevel + 0.01"+
		" WHERE signID = ? "
	}
	else{
		sqlQuery = "UPDATE mainsigns set latitude=?,longitude=?,"+
		"confidenceLevel = confidenceLevel - 0.01"+
		" WHERE signID = ? "
	}

	connection.query(sqlQuery,[lat,lng,id], function(err, rows)
    {

      if (err)
          console.log("Error Updating : %s ",err );
     
    });
}

function insertExtraSign(connection, data){
	connection.query("INSERT INTO extrasigns(extraSignName, extraDate, mainSignID) VALUES ?", 
		[data], function(err, rows)
    {

      if (err)
          console.log("Error Inserting : %s ",err );
     
    });
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

//Haversine
function Haversine(lat1, lon1, lat2, lon2){
	var R = 6371e3; // in metres

	var φ1 = toRadians(lat1);
	var φ2 = toRadians(lat2);
	var Δφ = toRadians((lat2-lat1));
	var Δλ = toRadians((lon2-lon1));

	var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
	        Math.cos(φ1) * Math.cos(φ2) *
	        Math.sin(Δλ/2) * Math.sin(Δλ/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

	var distance = R * c;

	return distance;
}

//Spherical Law of Cosines
function Spherical_Law_of_Cosines(lat1, lon1, lat2, lon2){
	var R = 6371e3; // in metres

	var φ1 = toRadians(lat1);
	var φ2 = toRadians(lat2);
	var Δλ = toRadians((lon2-lon1)); 

	var distance = Math.acos( Math.sin(φ1)*Math.sin(φ2) + Math.cos(φ1)*Math.cos(φ2) * Math.cos(Δλ) ) * R;

	return distance;
}

/*****************************************************
 *    Decide if executes an Insert or Update query   *
 *****************************************************/
 
function insertOrUpdate(connection, data, results, res){
    var pointTo;

    var insertValues = [];
    var updateValues = [];
    var newLat;
    var newLng;
    var actLat;
    var actLng;
    var Lat;
    var Lng;
    var signName;
    var flag = 0;

    var data_N = data.length;
    var results_N = results.length;

    console.log(data[0]);

    for(var j=0; j<data_N; j++){
    	//Create point for each item from data array 
		actLat = parseFloat(data[j].latitude);
    	actLng = parseFloat(data[j].longitude);
		signName = data[j].name;

    	//Verify each item for all signs in the repository (by city)
	    for(var i=0; i<results_N && flag == 0; i++){
	    	Lat = parseFloat(results[i].latitude);
	    	Lng = parseFloat(results[i].longitude);
	    	var distance = Haversine(actLat, actLng, Lat, Lng);
	    	
	    	//If lower than 5 meters, sign is updated in the repository
	    	if(distance < 5){
	    		if(signName === results[i].signName){
	    		console.log("\nDISTANCE: " + distance + " meters\n");
	    		newLat = (Lat + actLat)/2;
	    		newLng = (Lng + actLng)/2;
	    		updateSign(connection, newLat, newLng, results[i].signID, true);
	    		console.log("-------------------");
	    		console.log("SIGN " + results[i].signID + " UPDATED!");
	    		console.log("-------------------\n");
	    		}
	    		else{
	    			newLat = (Lat + actLat)/2;
	    			newLng = (Lng + actLng)/2;

		    		var created2 = new Date();

		            var extraSign = [  
		                signName,
		                created2, 
		                results[i].signID
		            ];

		            console.log(extraSign);

	    			insertExtraSign(connection, extraSign);
	    			//updateSign(connection, newLat, newLng, results[i].signID, false);
	    		}
	    		flag = 1;
	    	}

	    //Else a new sign is inserted
	    }
	    if(flag == 0){
    		var index = data[j];

    		var created = new Date();

            var newSign = [    
                index.latitude,
                index.longitude,
                index.name,
                index.orientation,
                0.5,
                1,
                created,
                "OK"
            ];

    		insertValues.push(newSign);
    		console.log("------------------");
    		console.log("NEW SIGN INSERTED!");
    		console.log("------------------\n");
    	}    

    	flag = 0;	    
    }

    if(insertValues.length != 0){
   		console.log("SIZE: " + insertValues.length);

   		console.log(insertValues);

	    /*var sql = "INSERT INTO mainsigns (latitude, longitude, signName, orientation, confidenceLevel, reportCount, date, status) VALUES ? "
	    var query = connection.query(sql, [insertValues], function(err, rows)
	    {

	      if (err){
	          console.log("Error inserting : %s ",err );
	      }
	      
	    });*/
	} 
	else{
		console.log("SIZE: " + insertValues.length);
	}
}

var counter = 0;

/*Save sign*/
exports.add_sign = function(req,res){

    //console.log(req.body);

    var jsonData = req.body;
    
    req.getConnection(function (err, connection) {

    	updatePolicy_1(connection, jsonData, res);
	
	});
};

exports.edit_sign = function(req,res){
    
    var input = JSON.parse(JSON.stringify(req.body));
    var id = req.params.id;
    
    req.getConnection(function (err, connection) {
        
        var data = {
            signName    : input.name,
            signOrientation : input.orientation,
            latitude : input.latitude,
            longitude   : input.longitude
        };
        
        connection.query("UPDATE mainsigns set ? WHERE id = ? ",[data,id], function(err, rows)
        {
  
          if (err)
              console.log("Error Updating : %s ",err );
         
          res.redirect('/signs');
          
        });
    
    });
};


exports.delete_sign = function(req,res){
          
     var id = req.params.id;
    
     req.getConnection(function (err, connection) {
        
        connection.query("DELETE FROM mainsigns  WHERE id = ? ",[id], function(err, rows)
        {
            
             if(err)
                 console.log("Error deleting : %s ",err );
            
             res.redirect('/signs');
             
        });
        
     });
};


