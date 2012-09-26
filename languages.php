<?php
error_reporting(-1);

function cors() {

    // Allow from any origin
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');    // cache for 1 day
    }

    // Access-Control headers are received during OPTIONS requests
    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {

        if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
            header("Access-Control-Allow-Methods: GET, POST, OPTIONS");         

        if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
            header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");

        exit(0);
    }
}
cors();

header("Cache-control: max-age=315360"); // 1% of 1 year
header("Content-type: application/json");
include ("../ppa/lang/translations.php");
$aLF = [];
foreach ($appLangFiles as $k => $v ) {
	$aLF[] = ["id"=>$k, "nativename"=>html_entity_decode($v,ENT_XHTML,'UTF-8')];
}
$aL = [];
foreach ($availableLanguages as $k => $v ) {
	$aL[] = ["iso639"=>$k, "id"=>$v];
}
$texts = [];
foreach ($appLangFiles as $k => $v) {
	unset($lang);
	$lang = [];
	include("../ppa/lang/$k.php");
	$texts[$k] = $lang;
}
echo json_encode(["availableLanguages"=>$aL, "appLangFiles" => $aLF, "texts" => $texts])
?>
