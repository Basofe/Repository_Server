/*
 * GET users listing.
 */

var sqlQuery = "SELECT * FROM mainsigns WHERE acos(sin(? * 0.0175) * sin(latitude * 0.0175) + cos(? * 0.0175) * cos(latitude * 0.0175) * cos(longitude * 0.0175 - (? * 0.0175))) * 6371 <= 50";

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

exports.list_extrasigns = function(req, res){

  var id = req.params.id;

  req.getConnection(function(err,connection){
       
    var query = connection.query("SELECT * FROM extrasigns WHERE mainSignID = ?", [id], function(err,rows)
    {
        
        if(err)
            console.log("Error Selecting : %s ",err );
 
        res.render('extrasigns',{page_title:"TRAFFIC SIGNS - Node.js",data:rows});
            
    });

  });
  
};

/*****************************************************
 *                  Update Policy 1                  *
 *****************************************************/

function updatePolicy_1(connection, data, extraResults, res){

	var results;

	var data_latitude = data[0].latitude;
	var data_longitude = data[0].longitude;

    var select = connection.query(sqlQuery, [data_latitude, data_latitude, data_longitude], function(err,rows)
    {
        
        if(err)
            console.log("Error Selecting : %s ",err );

        results = JSON.stringify(rows);

        results = JSON.parse(results);

        insertOrUpdate(connection, data, results, extraResults, res);

        res.redirect('/');
       
    });

}

/*****************************************************
 *                 Update sign by ID                 *  
 *****************************************************/

function updateSign(connection, lat, lng, id, bool){
	var sqlQuery;
	var newDate = new Date();

	if(bool){
		sqlQuery = "UPDATE mainsigns set latitude=?,longitude=?,"+
		"reportCount = reportCount + 1, confidenceLevel = confidenceLevel + 0.01,"+
		"date = ? WHERE signID = ? ";

		connection.query(sqlQuery,[lat,lng, newDate, id], function(err, rows)
	    {

	      if (err)
	          console.log("Error Updating : %s ",err );
	     
	    });
	}
	else{
		sqlQuery = "UPDATE mainsigns set "+
		"confidenceLevel = confidenceLevel - 0.01"+
		" WHERE signID = ? ";

		connection.query(sqlQuery,[id], function(err, rows)
	    {

	      if (err)
	          console.log("Error Updating : %s ",err );
	     
	    });
	}
}

function insertExtraSign(connection, data){
	var sql = "INSERT INTO extrasigns (extraSignName, extraDate, extraReportCount, extraType, mainSignID)" + 
	" VALUES ?"; 
	//ON DUPLICATE KEY UPDATE extraReportCount = IF(VALUES(mainSignID) = mainSignID, extraReportCount+1, extraReportCount)";
	//"extraDate = IF(mainSignID = ?, ?, 0)";

	connection.query(sql,[data], function(err, rows)
    {
      if (err)
          console.log("Error Inserting : %s ",err );
     
    });
}

function updateExtraSign(connection, extraID, extraName){
	var newDate = new Date();
	var sql = "UPDATE extrasigns set "+
		"extraReportCount = extraReportCount + 1, extraDate = ?"+
		" WHERE mainSignID = ? AND extraSignName = ?";

	connection.query(sql,[newDate, extraID, extraName], function(err, rows)
    {
      if (err)
          console.log("Error Inserting : %s ",err );
     
    });
}

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
function updateSigns(connection, data, bool){
	var sqlQuery;

	if(bool){
		sqlQuery = "UPDATE mainsigns set latitude=?,longitude=?,"+
		"reportCount = reportCount + 1, confidenceLevel = confidenceLevel + 0.01"+
		", date=? WHERE signID = ? ";

		connection.query(sqlQuery,[data.latitude, data.longitude, data.date, data.signID], function(err, rows)
	    {

	      if (err)
	          console.log("Error Updating : %s ",err );
	     
	    });
	}
	else{
		sqlQuery = "UPDATE mainsigns set "+
		"confidenceLevel = confidenceLevel - 0.01"+
		" WHERE signID = ? ";

		connection.query(sqlQuery,[data], function(err, rows)
	    {

	      if (err)
	          console.log("Error Updating : %s ",err );
	     
	    });
	}
}

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

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

var mysql = require('mysql');
var Q = require('kew');
 
function insertOrUpdate(connection, data, results, extraResults, res){
    var pointTo;

    var insertValues = [];
    var extraValues = [];
    var extraIDs = [];
    var extraNames = [];
    var updateValues = [];
    var newLat;
    var newLng;
    var actLat;
    var actLng;
    var Lat;
    var Lng;
    var signName, type;
    var flag = 0;
    var flag2 = 0;
    var counter = 0;

    var data_N = data.length;
    var results_N = results.length;
    var extraResults_N = extraResults.length;

    for(var j=0; j<data_N; j++){
    	//Create point for each item from data array 
		actLat = parseFloat(data[j].latitude);
    	actLng = parseFloat(data[j].longitude);
		signName = data[j].name;
		type = data[j].type;

    	//Verify each item for all signs in the repository (in a certain area)
	    for(var i=0; i<results_N && flag == 0; i++){
	    	Lat = parseFloat(results[i].latitude);
	    	Lng = parseFloat(results[i].longitude);
	    	var distance = Haversine(actLat, actLng, Lat, Lng);
	    	
	    	//If lower than 5 meters,...
	    	if(distance < 5){
	    		//... sign is updated in the repository
	    		if(signName === results[i].signName && type === results[i].type){
		    		console.log("\nDISTANCE: " + distance + " meters\n");
		    		newLat = (Lat + actLat)/2;
		    		newLng = (Lng + actLng)/2;
		    		var newDate = new Date();

		    		var Sign = [
		    			newLat,
		    			newLng,
		    			newDate,
		    			results[i].signID
		    		];

		    		updateValues.push(Sign);

		    		//updateSign(connection, newLat, newLng, results[i].signID, true);

		    		console.log("-------------------");
		    		console.log("SIGN " + results[i].signID + " UPDATED!");
		    		console.log("-------------------\n");
		    		flag = 1;
		    	}
	    		//... extra sign is inserted or updated in the repository
	    		else if (signName !== results[i].signName && type === results[i].type){
		    		var created2 = new Date();

		            var extraSign = [  
		                signName,
		                created2,
		                1,
		                data[j].type,
		                results[i].signID
		            ];

		            var extraID = [
		            	results[i].signID
		            ];

		            var extraName = [
		            	signName
		            ];

		            if(extraResults_N !=0){
			            for(var k=0; k<extraResults_N && flag2 == 0; k++){
			            	if(extraResults[k].extraSignName === signName && extraResults[k].mainSignID === results[i].signID){
				            	extraIDs.push(extraID);
				            	extraNames.push(extraName);
				            	updateExtraSign(connection,extraIDs,extraNames);
				            	extraNames.pop();
				            	extraIDs.pop();
				            	updateSign(connection, 0, 0, results[i].signID, false);
				            	flag = 1;
				            }
			        	}
			        	if(flag == 0){
			        		extraValues.push(extraSign);
			        		updateSign(connection, 0, 0, results[i].signID, false);
			        	}
			        }
			        else{
			     		extraValues.push(extraSign);
			     		updateSign(connection, 0, 0, results[i].signID, false);
			        }

	    			console.log("----------------------");
		    		console.log("EXTRA SIGN " + results[i].signID + " INSERTED!");
		    		console.log("----------------------\n");
		    		flag = 1;
	    		}
	    		else{
	    			flag = 0;
	    		}

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
                "OK",
                index.type
            ];

    		insertValues.push(newSign);
    		console.log("------------------");
    		console.log("NEW SIGN INSERTED!");
    		console.log("------------------\n");
    	}    

    	flag = 0;	    
    }

    if(extraValues.length != 0){
    	//insertExtraSign(connection, extraValues, extraIDs, extraNames);
    }

    if(updateValues.length != 0){
    	var defer = Q.defer()
	    var queries = '';

		updateValues.forEach(function (item) {
		  queries += mysql.format("UPDATE mainsigns set latitude=?, longitude=?, "+
					"reportCount = reportCount + 1, confidenceLevel = confidenceLevel + 0.01"+
					", date=? WHERE signID = ? ; ", item);
		});

		connection.query(queries, defer.makeNodeResolver());
    }

    if(insertValues.length != 0){
   		console.log("SIZE: " + insertValues.length);

	    var sql = "INSERT INTO mainsigns (latitude, longitude, signName, orientation, confidenceLevel, reportCount, date, status, type) VALUES ? ";
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

	//console.log("COUNTER: " + data_N + " | " + results_N);
}

var counter = 0;

/*Save sign*/
exports.add_sign = function(req,res){

    var jsonData = req.body;

    var extraResults;
    
    req.getConnection(function (err, connection) {

    	var select = connection.query("SELECT * FROM extrasigns ", function(err,rows)
	    {
	        
	        if(err)
	            console.log("Error Selecting : %s ",err );

	        extraResults = JSON.stringify(rows);

        	extraResults = JSON.parse(extraResults);

        	updatePolicy_1(connection, jsonData, extraResults, res);
	 
		});
	
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


