<?php

// establish connection to SQL server (using credentials from yaml file)
if (strpos(getenv('SERVER_SOFTWARE'), 'Development') === false) {
    $mysqli = new mysqli(
        null,
        getenv('PRODUCTION_DB_USERNAME'),
        getenv('PRODUCTION_DB_PASSWORD'),
        getenv('PRODUCTION_DB_NAME'),
        null,
        getenv('PRODUCTION_CLOUD_SQL_INSTANCE'));
} else {
    $mysqli = new mysqli(
        getenv('DEVELOPMENT_DB_HOST'),
        getenv('DEVELOPMENT_DB_USERNAME'),
        getenv('DEVELOPMENT_DB_PASSWORD'),
        getenv('DEVELOPMENT_DB_NAME'),
        null,
        null);
}
