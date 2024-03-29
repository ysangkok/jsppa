<?php
// Set this variable to the root URL of the tested PPA 
$webUrl = 'http://localhost:8800/ppa';

/* An Array of the servers you want to use for testing, based on the entries
	found in your conf/config.inc.php file, matching the $server[n]['desc'] 
	field. Once you have listed the server here, you need to make a 
	corresponding entry in the $super_user and $super_pass arrays that follow.
*/

$test_servers = array('PostgreSQL');

/* Associative array with the super user names for each configured server in 
	your conf/config.inc.php :
		* $super_user = array(
		* 	the 'desc' part of the server in your conf/config.inc.php => the 
			super user name,
		* 	...
		* )
	These profiles are only used to create the admin test role (or user) on 
	each server.
*/

$super_user= array(
	'PostgreSQL' => 'janus', 
); 


/* Associative array with the super user passwords for each configured server 
	in your conf/config.inc.php :
 		* $super_pass = array(
 		*	the 'desc' part of the server in your conf/config.inc.php => the 
			super user password,
 		*	...
 		* )
*/
$super_pass= array(
	'PostgreSQL' => 'secret', 
); 


// name and pass of the admin user to create for tests
$admin_user = 'admin_user';
$admin_user_pass = 'super';

// name and pass of the user to create for tests
$user = 'ppa_tests_user';
$user_pass = 'ppa_tests_user_pass';

// name of the database to create for tests 
$testdb = 'ppatests_db';

?>
