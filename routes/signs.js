/*
 * GET users listing.
 */


//'SELECT latitude, longitude, ( 3959 * acos( cos( radians(37) ) * cos( radians( lat ) ) * cos( radians( long ) - radians(-122) ) + sin( radians(37) ) * sin(radians(lat)) ) ) AS distance FROM myTable HAVING distance < 50 ORDER BY distance'

exports.list_signs = function(req, res){

  req.getConnection(function(err,connection){
       
    var query = connection.query('SELECT * FROM signs',function(err,rows)
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

function updatePolicy_1(connection, data, actualCity, res){

	var results;

	console.log(actualCity);

    var select = connection.query("SELECT * FROM signs WHERE city = ?", [actualCity] ,function(err,rows)
    {
        
        if(err)
            console.log("Error Selecting : %s ",err );

        results = JSON.stringify(rows);

        results = JSON.parse(results);

        insertOrUpdate(connection, data, results, res);

        res.redirect('/');
       
    });

}

/*****************************************************
 *           Update sign coordinates by ID           *  
 *****************************************************/

function updateSign(connection, lat, lng, id){
	connection.query("UPDATE signs set latitude=?,longitude=? WHERE idsigns = ? ",[lat,lng,id], function(err, rows)
    {

      if (err)
          console.log("Error Updating : %s ",err );
     
    });
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
		var GeoPoint = require('geopoint'),
		pointFrom = new GeoPoint(actLat, actLng);
		signName = data[j].name;

    	//Verify each item for all signs in the repository (by city)
	    for(var i=0; i<results_N && flag == 0; i++){
	    	Lat = parseFloat(results[i].latitude);
	    	Lng = parseFloat(results[i].longitude);
	    	pointTo = new GeoPoint(Lat, Lng);
	    	var distance = pointFrom.distanceTo(pointTo, true);
	    	
	    	//If lower than 5 meters, sign is updated in the repository
	    	//console.log(results[i]);
	    	if(distance < 0.005 && signName === results[i].signName){
	    		console.log("\nDISTANCE: " + distance + " kilometers\n");
	    		newLat = (Lat + actLat)/2;
	    		newLng = (Lng + actLng)/2;
	    		updateSign(connection, newLat, newLng, results[i].idsigns);
	    		flag = 1;
	    		console.log("-------------------");
	    		console.log("SIGN " + results[i].idsigns + " UPDATED!");
	    		console.log("-------------------\n");
	    	}

	    //Else a new sign is inserted
	    }
	    if(flag == 0){
    		var index = data[j];

            var location = crg(index.latitude, index.longitude);
            
            var city = location[0].region;

            var newSign = [    
                index.latitude,
                index.longitude,
                index.name,
                index.orientation,
                city
            ];

    		insertValues.push(newSign);
    		//console.log("------------------");
    		//console.log("NEW SIGN INSERTED!");
    		//console.log("------------------\n");
    	}    

    	flag = 0;	    
    }

    if(insertValues.length != 0){
   		console.log("SIZE: " + insertValues.length);

	    var sql = "INSERT INTO signs (latitude, longitude, signName, signOrientation, city) VALUES ? "
	    var query = connection.query(sql, [insertValues], function(err, rows)
	    {

	      if (err){
	          console.log("Error inserting : %s ",err );
	      }
	      
	    });
	} 
	else{
		console.log("SIZE: " + insertValues.length);
	}
}

var counter = 0;

/*Save the customer*/
exports.add_sign = function(req,res){

    //console.log(req.body);

    var jsonData = req.body;
    
    req.getConnection(function (err, connection) {

    	var location = crg(jsonData[0].latitude, jsonData[0].longitude);

    	console.log(location);

    	updatePolicy_1(connection, jsonData, location[0].region, res);
	
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
        
        connection.query("UPDATE signs set ? WHERE id = ? ",[data,id], function(err, rows)
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
        
        connection.query("DELETE FROM signs  WHERE id = ? ",[id], function(err, rows)
        {
            
             if(err)
                 console.log("Error deleting : %s ",err );
            
             res.redirect('/signs');
             
        });
        
     });
};


