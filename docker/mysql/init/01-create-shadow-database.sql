CREATE DATABASE IF NOT EXISTS orderflow_shadow;

GRANT ALL PRIVILEGES ON orderflow_shadow.* TO 'orderflow'@'%';
