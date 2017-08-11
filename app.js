
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var promise = require( 'promise' );

//load customers route
var signs = require('./routes/signs'); 
var app = express();

var connection = require('express-myconnection'); 
var mysql = require('mysql');
var bodyParser = require("body-parser");

// all environments
app.set('port', process.env.PORT || 4300);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

/*------------------------------------------
    connection peer, register as middleware
    type koneksi : single,pool and request 
-------------------------------------------*/

app.use(
    
    connection(mysql,{
        
      host     : 'localhost',
      user     : 'root',
      password : '12345',
      database : 'communitydb'

    },'pool') //or single

);


app.get('/', routes.index);

app.get('/signs', signs.list_signs);
app.get('/extrasigns/:id', signs.list_extrasigns);
app.post('/signs/add', signs.add_sign);
app.delete('/signs/delete/:id', signs.delete_sign);
app.post('/signs/edit/:id',signs.edit_sign);


app.use(app.router);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
