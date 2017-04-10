<?php
$error = filter_input(INPUT_GET, 'err', $filter = FILTER_SANITIZE_STRING);
if (!$error) $error = 'Oops! An unknown error happened.';
?>

<!DOCTYPE html>
<html>

<head>
    <title>Error</title>

    <!-- android -->
    <link rel="shortcut icon" sizes="196x196" href="/img/EasyRoutePlannerIcon196.png">
    <!-- iOS -->
    <link rel="apple-touch-icon" href="/img/EasyRoutePlannerIcon76.png">
    <link rel="apple-touch-icon" sizes="76x76" href="/img/EasyRoutePlannerIcon76.png">
    <link rel="apple-touch-icon" sizes="120x120" href="/img/EasyRoutePlannerIcon120.png">
    <link rel="apple-touch-icon" sizes="152x152" href="/img/EasyRoutePlannerIcon152.png">

    <meta name="viewport" content="width=device-width,user-scalable=no,initial-scale=1.0,maximum-scale=1.0,minimum-scale=1.0">

    <link rel="stylesheet" href="css/mapmagic.css" />
</head>

<body>

<h1>There was a problem</h1>
<p class="error"><?php echo $error; ?></p>

</body>

</html>
