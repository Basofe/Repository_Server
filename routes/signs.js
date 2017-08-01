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
         
         //console.log(query.sql);
    });
  
};

var crg = require('city-reverse-geocoder');

function meanCoordinates(newLat, newLon) {
    lat = (lat + newLat)/2;
    lon = (lon + newLon)/2;
}

function pointInCircle(point, radius, center){ 
    return (google.maps.geometry.spherical.computeDistanceBetween(point, center) <= radius)
}

var counter = 0;

var InsertQuery = require('mysql-insert-multiple');

/*Save the customer*/
exports.add_sign = function(req,res){

    //console.log(req.body);

    var jsonData = req.body;

    
    //var jsonString = JSON.stringify( req.body );
    //console.log(jsonString);
    
    req.getConnection(function (err, connection) {

        var N = jsonData.length; 
        var values = [];

        for (var i = 0; i < N; i++) {
            var index = jsonData[i];
            //console.log(index);

            var results = crg(index.latitude, index.longitude);
            
            var city = results[0].region;

            var data = [    
                index.latitude,
                index.longitude,
                index.name,
                index.orientation,
                city
            ];

            //console.log(data);

            values.push(data);
            
            /*var query = connection.query("INSERT INTO signs set ? ",data, function(err, rows)
            {
      
              if (err)
                  console.log("Error inserting : %s ",err );
             
              //res.redirect('/');
              
            });*/

            counter++
        }

        /*values = [
	        ["39.93631600342309","-8.237951709634846","Stop","2.360569"],
	        ["41.33151873502948","-8.748333882816908","Stop","1.4045537"],
	        ["41.24428728126322","-7.975176099657752","Stop","1.1400907"]
	        ];*/

	    console.log(values);

        var sql = "INSERT INTO signs (latitude, longitude, signName, signOrientation, city) VALUES ? "
        var query = connection.query(sql, [values], function(err, rows)
            {
      
              if (err)
                  console.log("Error inserting : %s ",err );
             
              //res.redirect('/');
              
            });

        res.redirect('/');
        //console.log(values);
        console.log(counter);
        
       // console.log(query.sql); get raw query
    
    });
};

/*async.mapSeries(allNames, (data, callback) => {
    connection.query('INSERT INTO names (firstname, lastname) VALUES ?', [data.firstName, data.firstName], (err, result) => {
        if (err) {
            console.error('error: ' + err.stack);
            callback(err);
        } else {
            callback(null, result);
        }
    });
}, (err, results) => {
    // Final callback
    if (err) {
        console.log(`Error: ${err}`);
    }
});*/

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


