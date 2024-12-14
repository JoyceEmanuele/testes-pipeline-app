ALTER TABLE CLUNITS 
ADD COLUMN UNIT_CODE_CELSIUS varchar(50) DEFAULT NULL, 
ADD COLUMN UNIT_CODE_API varchar(50) DEFAULT NULL;


UPDATE CLUNITS
SET UNIT_CODE_CELSIUS = SUBSTRING_INDEX(UNIT_NAME, ' ', 1)
WHERE CLIENT_ID IN (
  SELECT CLIENT_ID
  FROM CLIENTS
  WHERE NAME IN (
    "SANTANDER BA", 
    "SANTANDER EXPANSÃO - 2023", 
    "SANTANDER EXPANSÃO - 2022", 
    "SANTANDER EXPANSÃO - 2021"
  )
);


UPDATE CLUNITS
SET UNIT_CODE_API = 
    CASE 
        WHEN REGEXP_REPLACE(SUBSTRING_INDEX(UNIT_NAME, ' ', 1), '[^0-9]', '') != '' THEN 
            CAST(REGEXP_REPLACE(SUBSTRING_INDEX(UNIT_NAME, ' ', 1), '[^0-9]', '') AS UNSIGNED)
        ELSE 
            NULL
    END
WHERE CLIENT_ID IN (
    SELECT CLIENT_ID
    FROM CLIENTS
    WHERE NAME IN (
        "SANTANDER BA", 
        "SANTANDER EXPANSÃO - 2023", 
        "SANTANDER EXPANSÃO - 2022", 
        "SANTANDER EXPANSÃO - 2021"
    )
);

-- $$ --

CREATE TABLE VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS (
  ADDRESS tinyint(3) unsigned NOT NULL,
  ALIAS varchar(30) DEFAULT NULL,
  DESCRIPTION varchar(50) NOT NULL,
  VALUE smallint(3) DEFAULT NULL,
  ID tinyint(3) unsigned NOT NULL DEFAULT 1,
  IP varchar(30) DEFAULT NULL,

  PRIMARY KEY (ALIAS)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO VAV_BAC_6000_AMLN_AUTOMATION_COMMANDS (ADDRESS,ALIAS,DESCRIPTION,VALUE,ID,IP) VALUES
(0,'ON','Status do termostato ON',1,1,NULL),
(0,'OFF','Status do termostato OFF',0,1,NULL),
(1,'FAN_ON','Velocidade de ventilação ON',1,1,NULL),
(1,'FAN_OFF','Velocidade de ventilação OFF',0,1,NULL),
(2,'COOL','Modo de operação Refrigerar',0,1,NULL),
(2,'FAN','Modo de operação Ventilar',2,1,NULL),
(3,'SET15','Setpoint Temp 15',150,1,NULL),
(3,'SET16','Setpoint Temp 16',160,1,NULL),
(3,'SET17','Setpoint Temp 17',170,1,NULL),
(3,'SET18','Setpoint Temp 18',180,1,NULL),
(3,'SET19','Setpoint Temp 19',190,1,NULL),
(3,'SET20','Setpoint Temp 20',200,1,NULL),
(3,'SET21','Setpoint Temp 21',210,1,NULL),
(3,'SET22','Setpoint Temp 22',220,1,NULL),
(3,'SET23','Setpoint Temp 23',230,1,NULL),
(3,'SET24','Setpoint Temp 24',240,1,NULL),
(3,'SET25','Setpoint Temp 25',250,1,NULL),
(3,'SET26','Setpoint Temp 26',260,1,NULL),
(3,'SET27','Setpoint Temp 27',270,1,NULL),
(3,'SET28','Setpoint Temp 28',280,1,NULL),
(3,'SET29','Setpoint Temp 29',290,1,NULL),
(3,'SET30','Setpoint Temp 30',300,1,NULL);

CREATE TABLE VAV_BAC_AUTOMATION_COMMANDS (
  ADDRESS tinyint(3) unsigned NOT NULL,
  ALIAS varchar(30) DEFAULT NULL,
  DESCRIPTION varchar(50) NOT NULL,
  VALUE smallint(3) DEFAULT NULL,
  ID tinyint(3) unsigned NOT NULL DEFAULT 1,
  IP varchar(30) DEFAULT NULL,

  PRIMARY KEY (ALIAS)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO VAV_BAC_AUTOMATION_COMMANDS (ADDRESS,ALIAS,DESCRIPTION,VALUE,ID,IP) VALUES 
(0,'ON','Status do termostato ON',1,1,NULL),
(0,'OFF','Status do termostato OFF',0,1,NULL),
(1,'FAN_ON','Velocidade de ventilação ON',1,1,NULL),
(1,'FAN_OFF','Velocidade de ventilação OFF',1,1,NULL),
(2,'COOL','Modo de operação Refrigerar',0,1,NULL),
(2,'FAN','Modo de operação Ventilar',2,1,NULL),
(3,'SET15','Setpoint Temp 15',150,1,NULL),
(3,'SET16','Setpoint Temp 16',160,1,NULL),
(3,'SET17','Setpoint Temp 17',170,1,NULL),
(3,'SET18','Setpoint Temp 18',180,1,NULL),
(3,'SET19','Setpoint Temp 19',190,1,NULL),
(3,'SET20','Setpoint Temp 20',200,1,NULL),
(3,'SET21','Setpoint Temp 21',210,1,NULL),
(3,'SET22','Setpoint Temp 22',220,1,NULL),
(3,'SET23','Setpoint Temp 23',230,1,NULL),
(3,'SET24','Setpoint Temp 24',240,1,NULL),
(3,'SET25','Setpoint Temp 25',250,1,NULL),
(3,'SET26','Setpoint Temp 26',260,1,NULL),
(3,'SET27','Setpoint Temp 27',270,1,NULL),
(3,'SET28','Setpoint Temp 28',280,1,NULL),
(3,'SET29','Setpoint Temp 29',290,1,NULL),
(3,'SET30','Setpoint Temp 30',300,1,NULL);

CREATE TABLE CARRIER_ECOSPLIT_AUTOMATION_COMMANDS (
  ALIAS varchar(20) NOT NULL,
  ARRAY varchar(100) NOT NULL,
  DESCRIPTION varchar(50) NOT NULL,

  PRIMARY KEY (ALIAS)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO CARRIER_ECOSPLIT_AUTOMATION_COMMANDS (ALIAS,DESCRIPTION,ARRAY) VALUES
('OFF','Turn OFF','[154,86,241,254,14,182,0,24,0,0,1,0,98,30]'),
('FAN','Fan','[154,86,241,254,14,185,0,25,0,0,3,0,110,48]'),
('SET17','Setpoint Temp 17','[154,86,241,254,14,185,0,17,0,0,1,0,100,28]'),
('SET18','Setpoint Temp 18','[154,86,241,254,14,185,0,18,0,0,1,0,103,32]'),
('SET19','Setpoint Temp 19','[154,86,241,254,14,185,0,19,0,0,1,0,102,32]'),
('SET20','Setpoint Temp 20','[154,86,241,254,14,185,0,20,0,0,1,0,97,28]'),
('SET21','Setpoint Temp 21','[154,86,241,254,14,185,0,21,0,0,1,0,96,28]'),
('SET22','Setpoint Temp 22','[154,86,241,254,14,185,0,22,0,0,1,0,99,32]'),
('SET23','Setpoint Temp 23','[154,86,241,254,14,185,0,23,0,0,1,0,98,32]'),
('SET24','Setpoint Temp 24','[154,86,241,254,14,185,0,24,0,0,1,0,109,44]'),
('SET25','Setpoint Temp 25','[154,86,241,254,14,185,0,25,0,0,1,0,108,44]');

-- $$ --
-- INSERE CÁLCULO DE VERSÃO PARA VERSÃO DE FIRMWARE DE DISPOSITIVOS
ALTER TABLE DEVFWVERS ADD `V_MAJOR` int(11) GENERATED ALWAYS AS (cast(substring_index(replace(substring_index(case when `CURRFW_VERS` regexp '^v?[[:digit:]]+[._][[:digit:]]+[._][[:digit:]]+(-.*)?$' then `CURRFW_VERS` else '0' end,'v',-1),'_','.'),'.',1) as signed)) STORED;
ALTER TABLE DEVFWVERS ADD `V_MINOR` int(11) GENERATED ALWAYS AS (cast(substring_index(substring_index(replace(substring_index(case when `CURRFW_VERS` regexp '^v?[[:digit:]]+[._][[:digit:]]+[._][[:digit:]]+(-.*)?$' then `CURRFW_VERS` else '0.0.0' end,'v',-1),'_','.'),'.',2),'.',-1) as signed)) STORED;
ALTER TABLE DEVFWVERS ADD `V_PATCH` int(11) GENERATED ALWAYS AS (cast(substring_index(substring_index(replace(substring_index(case when `CURRFW_VERS` regexp '^v?[[:digit:]]+[._][[:digit:]]+[._][[:digit:]]+(-.*)?$' then `CURRFW_VERS` else '0.0.0' end,'v',-1),'_','.'),'.',-1),'-',1) as signed)) STORED;
ALTER TABLE DEVFWVERS ADD `V_EXTRA` varchar(50) GENERATED ALWAYS AS (substr(substr(substring_index(replace(substring_index(`CURRFW_VERS`,'v',-1),'_','.'),'.',-1),locate('-',substring_index(replace(substring_index(`CURRFW_VERS`,'v',-1),'_','.'),'.',-1))),2)) STORED;

CREATE INDEX IDX_DEVFWVERS_VERSION ON DEVFWVERS (HW_TYPE, V_MAJOR, V_MINOR, V_PATCH, V_EXTRA);

-- TABELA DE RELAÇÃO SENSOR X VERSÃO -> CURVA
CREATE TABLE `SENSOR_FIRMWARE_CURVES` (
  ID int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  SENSOR_ID varchar(50) NOT NULL REFERENCES SENSORS(SENSOR_ID),
  MULT_QUAD decimal(6, 4) DEFAULT 0 NOT NULL,
  MULT_LIN decimal(6, 4) NOT NULL,
  OFST decimal (6, 4) NOT NULL,
  MIN_FW_VERSION varchar(100) NOT NULL DEFAULT '0.0.0',
  V_MAJOR int(11) GENERATED ALWAYS AS (cast(substring_index(replace(substring_index(case when `MIN_FW_VERSION` regexp '^v?[[:digit:]]+[._][[:digit:]]+[._][[:digit:]]+(-.*)?$' then `MIN_FW_VERSION` else '0' end,'v',-1),'_','.'),'.',1) as signed)) STORED,
  V_MINOR int(11) GENERATED ALWAYS AS (cast(substring_index(substring_index(replace(substring_index(case when `MIN_FW_VERSION` regexp '^v?[[:digit:]]+[._][[:digit:]]+[._][[:digit:]]+(-.*)?$' then `MIN_FW_VERSION` else '0.0.0' end,'v',-1),'_','.'),'.',2),'.',-1) as signed)) STORED,
  V_PATCH int(11) GENERATED ALWAYS AS (cast(substring_index(substring_index(replace(substring_index(case when `MIN_FW_VERSION` regexp '^v?[[:digit:]]+[._][[:digit:]]+[._][[:digit:]]+(-.*)?$' then `MIN_FW_VERSION` else '0.0.0' end,'v',-1),'_','.'),'.',-1),'-',1) as signed)) STORED,
  V_EXTRA varchar(50) GENERATED ALWAYS AS (substr(substr(substring_index(replace(substring_index(`MIN_FW_VERSION`,'v',-1),'_','.'),'.',-1),locate('-',substring_index(replace(substring_index(`MIN_FW_VERSION`,'v',-1),'_','.'),'.',-1))),2)) STORED
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO SENSOR_FIRMWARE_CURVES (SENSOR_ID, MIN_FW_VERSION, MULT_QUAD, MULT_LIN, OFST)
	SELECT SENSORS.SENSOR_ID, '0.0.0', SENSORS.MULT_QUAD, SENSORS.MULT_LIN, SENSORS.OFST FROM SENSORS;
	
-- APAGA COLUNAS ANTIGAS
ALTER TABLE SENSORS DROP COLUMN MULT_QUAD;
ALTER TABLE SENSORS DROP COLUMN MULT_LIN;
ALTER TABLE SENSORS DROP COLUMN OFST;

-- $$ --
ALTER TABLE CURRENT_AUTOMATIONS_PARAMETERS ADD AUTOMATION_INTERVAL int unsigned DEFAULT NULL;

-- $$ --
ALTER TABLE CLUNITS
ADD CONSTRAINT unique_client_unit_code_api UNIQUE (CLIENT_ID, UNIT_CODE_API);

ALTER TABLE CLUNITS
ADD CONSTRAINT unique_client_unit_code_celsius UNIQUE (CLIENT_ID, UNIT_CODE_CELSIUS);

-- $$ --
UPDATE CHILLER_CARRIER_30XA_HVAR_COMMANDS SET FORMULA = '/10' WHERE ALIAS = 'ALM';

-- $$ --
ALTER TABLE DUTS_DUO_EVAPORATORS
ADD CONSTRAINT DUT_DUO_ID UNIQUE (DUT_DUO_ID);

ALTER TABLE DUTS_DUO_EVAPORATORS
ADD CONSTRAINT EVAPORATOR_ID UNIQUE (EVAPORATOR_ID);

ALTER TABLE DACS_EVAPORATORS
ADD CONSTRAINT EVAPORATOR_ID UNIQUE (EVAPORATOR_ID);

ALTER TABLE DACS_CONDENSERS
ADD CONSTRAINT CONDENSER_ID UNIQUE (CONDENSER_ID);

