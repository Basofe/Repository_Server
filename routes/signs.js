/*
 * GET users listing.
 */


//'SELECT latitude, longitude, ( 3959 * acos( cos( radians(37) ) * cos( radians( lat ) ) * cos( radians( long ) - radians(-122) ) + sin( radians(37) ) * sin(radians(lat)) ) ) AS distance FROM myTable HAVING distance < 50 ORDER BY distance'

exports.list_signs = function(req, res){

  req.getConnection(function(err,connection){
       
    var query = connection.query('SELECT * FROM signs WHERE city="Portalegre"',function(err,rows)
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

function updatePolicy_1(connection, actualCity, res){

	var results;

    var select = connection.query('SELECT * FROM signs WHERE city=?', [actualCity], function(err,rows)
    {
        
        if(err)
            console.log("Error Selecting : %s ",err );

        results = JSON.stringify(rows);

        results = JSON.parse(results);

        insertOrUpdate(connection, 41.5759, -7.9822, results, res);

        res.render('signs',{page_title:"TRAFFIC SIGNS - Node.js",data:rows});
       
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
 
function insertOrUpdate(connection, latFrom, lngFrom, results, res){

	var GeoPoint = require('geopoint'),
    pointFrom = new GeoPoint(latFrom, lngFrom);

    var pointTo;

    var insertValues = [];
    var updateValues = [];
    var newLat;
    var newLng;

    for(var i=0; i<results.length; i++){
    	newLat = parseFloat(results[i].latitude);
    	newLng = parseFloat(results[i].longitude);
    	pointTo = new GeoPoint(newLat, newLng);
    	var distance = pointFrom.distanceTo(pointTo, true);

    	if(distance < 0.005){
    		console.log(distance + " kilometers");
    		newLat = (latFrom + newLat)/2;
    		newLng = (lngFrom + newLng)/2;
    		updateSign(connection, newLat, newLng, results[i].idsigns);
    	}
    	else{
    		var index = results[i];

            var location = crg(index.latitude, index.longitude);
            
            var city = location[0].region;

            var data = [    
                index.latitude,
                index.longitude,
                index.name,
                index.orientation,
                city
            ];

    		insertValues.push(results[i]);
    	}
    }

    var sql = "INSERT INTO signs (latitude, longitude, signName, signOrientation, city) VALUES ? "
    var query = connection.query(sql, [insertValues], function(err, rows)
    {

      if (err)
          console.log("Error inserting : %s ",err );
     
      res.redirect('/');
      
    });
}

var counter = 0;

/*Save the customer*/
exports.add_sign = function(req,res){

    //console.log(req.body);

    var jsonData = req.body;
    
    req.getConnection(function (err, connection) {

    	var location = crg(jsonData[0].latitude, jsonData[0].longitude);

    	updatePolicy_1(connection, location[0].region, res);
	
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


