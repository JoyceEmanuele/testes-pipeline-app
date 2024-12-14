-- $$ --

CREATE TABLE CURRENT_DEVICE_STATE (
  DEVICE_CODE varchar(50) NOT NULL,
  STATE_CONN varchar(20) DEFAULT NULL,

  PRIMARY KEY (DEVICE_CODE)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- $$ --

ALTER TABLE ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS ADD CONSTRAINT ILLUMINATIONS_CURRENT_AUTOMATIONS_PARAMETERS_uk_ILLUMINATION_ID UNIQUE KEY (ILLUMINATION_ID);

-- $$ --

ALTER TABLE DACS_EVAPORATORS_HIST
ADD CONSTRAINT DACS_EVAPORATORS_HIST_uk_DEVICE_CODE_START_DATE_EVAPORATOR_ID
UNIQUE (START_DATE, EVAPORATOR_ID, DEVICE_CODE);

ALTER TABLE DACS_CONDENSERS_HIST
ADD CONSTRAINT DACS_CONDENSERS_HIST_uk_DEVICE_CODE_START_DATE_CONDENSER_ID
UNIQUE (START_DATE, CONDENSER_ID, DEVICE_CODE);

ALTER TABLE DACS_ASSET_HEAT_EXCHANGERS_HIST
ADD CONSTRAINT DACS_ASSET_HEAT_EXCHANGERS_HIST_uk_START_DEV_HEAT_EXCHANGER_ID
UNIQUE (START_DATE, ASSET_HEAT_EXCHANGER_ID, DEVICE_CODE);

-- $$ --


ALTER TABLE TIME_ZONES ADD COLUMN POSIX VARCHAR(50) DEFAULT NULL;
ALTER TABLE TIME_ZONES ADD COLUMN DST_ABREVIATION VARCHAR(10) DEFAULT NULL;
ALTER TABLE TIME_ZONES ADD COLUMN ABREVIATION_ZONE VARCHAR(10) DEFAULT NULL;
ALTER TABLE CLUNITS DROP FOREIGN KEY CLUNITS_fk_TIMEZONE_ID;
TRUNCATE TABLE TIME_ZONES;
INSERT INTO TIME_ZONES (id, time_zone_offset, area, posix, dst_abreviation, abreviation_zone)
VALUES 
	(1, 12, 'Pacific/Auckland', 'NZST-12NZDT,M9.5.0,M4.1.0/3', 'NZDT', 'NZST'),
	(2, 12, 'Pacific/Fiji', 'FJT-12', 'FJST', 'FJT'),
	(3, 11, 'Asia/Magadan', 'MAGT-11MAGST,M3.5.0,M10.5.0/3', 'MAGST', 'MAGT'),
	(4, 11, 'Asia/Sakhalin', 'SAKT-10SAKST,M3.5.0,M10.5.0/3', 'SAKST', 'SAKT'),
	(5, 10, 'Australia/Melbourne', 'EST-10EST,M10.1.0,M4.1.0/3', 'EST', 'EST'),
	(6, 10, 'Australia/Sydney', 'EST-10EST,M10.1.0,M4.1.0/3', 'EST', 'EST'),
	(7, 9, 'Asia/Seoul', 'KST-9', null, 'KST'),
	(8, 9, 'Asia/Tokyo', 'JST-9', null, 'JST'),
	(9, 8, 'Asia/Singapore', 'SGT-8', null, 'SGT'),
	(10, 8, 'Asia/Hong_Kong', 'HKT-8', null, 'HKT'),
	(12, 7, 'Asia/Jakarta', 'WIT-7', null, 'WIT'),
	(13, 6, 'Asia/Almaty', 'ALMT-6', null, 'ALMT'),
	(14, 6, 'Asia/Dhaka', 'BDT-6', null, 'BDT'),
	(16, 5, 'Asia/Tashkent', 'UZT-5', null, 'UZT'),
	(18, 4, 'Asia/Dubai', 'GST-4', null, 'GST'),
	(19, 3, 'Europe/Istanbul', 'EET-2EEST,M3.5.0/3,M10.5.0/4', 'EEST', 'EET'),
	(20, 3, 'Europe/Moscow', 'MSK-3MSD,M3.5.0,M10.5.0/3', 'MSD', 'MSK'),
	(21, 2, 'Africa/Cairo', 'EEST-2', null, 'EEST'),
	(22, 2, 'Africa/Johannesburg', 'SAST-2', null, 'SAST'),
	(23, 1, 'Europe/Madrid', 'CET-1CEST,M3.5.0,M10.5.0/3', 'CEST', 'CET'),
	(24, 1, 'Europe/Paris', 'CET-1CEST,M3.5.0,M10.5.0/3', 'CEST', 'CET'),
	(25, 0, 'Europe/Lisbon', 'WET0WEST,M3.5.0/1,M10.5.0', 'WEST', 'WET'),
	(26, 0, 'Europe/London', 'GMT0BST,M3.5.0/1,M10.5.0', 'BST', 'GMT'),
	(27, -1, 'Atlantic/Cape_Verde', 'CVT1', null, 'CVT'),
	(28, -1, 'Atlantic/Azores', 'AZOT1AZOST,M3.5.0/0,M10.5.0/1', 'AZOST', 'AZOT'),
	(29, -2, 'America/Noronha', 'FNT2', null, 'FNT'),
	(30, -2, 'Atlantic/South_Georgia', 'GST2', null, 'GST'),
	(31, -3, 'America/Sao_Paulo', 'BRT3BRST,M10.2.0/0,M2.3.0/0', 'BRST', 'BRT'),
	(32, -3, 'America/Argentina/Buenos_Aires', 'ART3ARST,M10.1.0/0,M3.3.0/0', 'ARST', 'ART'),
	(33, -4, 'America/Santo_Domingo', 'AST4', null, 'AST'),
	(34, -4, 'America/Puerto_Rico', 'AST4', null, 'AST'),
	(35, -5, 'America/New_York', 'EST5EDT,M3.2.0,M11.1.0', 'EDT', 'EST'),
	(36, -5, 'America/Toronto', 'EST5EDT,M3.2.0,M11.1.0', 'EDT', 'EST'),
	(37, -6, 'America/Chicago', 'CST6CDT,M3.2.0,M11.1.0', 'CDT', 'CST'),
	(38, -6, 'America/Mexico_City', 'CST6CDT,M4.1.0,M10.5.0', 'CDT', 'CST'),
	(39, -7, 'America/Edmonton', 'MST7MDT,M3.2.0,M11.1.0', 'MDT', 'MST'),
	(40, -7, 'America/Denver', 'MST7MDT,M3.2.0,M11.1.0', 'MDT', 'MST'),
	(41, -8, 'America/Los_Angeles', 'PST8PDT,M3.2.0,M11.1.0', 'PDT', 'PST'),
	(42, -8, 'America/Tijuana', 'PST8PDT,M4.1.0,M10.5.0', 'PDT', 'PST'),
	(43, -9, 'America/Anchorage', 'AKST9AKDT,M3.2.0,M11.1.0', 'AKDT', 'AKST'),
	(44, -9, 'America/Juneau', 'AKST9AKDT,M3.2.0,M11.1.0', 'AKDT', 'AKST'),
	(45, -10, 'America/Adak', 'HAST10HADT,M3.2.0,M11.1.0', 'HADT', 'HAST'),
	(46, -10, 'Pacific/Honolulu', 'HST10', null, 'HST'),
	(47, -11, 'Pacific/Midway', 'SST11', null, 'SST'),
	(48, -11, 'Pacific/Niue', 'NUT11', null, 'NUT'),	
	(49, -12, 'Pacific/Kwajalein', 'MHT-12', null, 'MHT'),
	(50, -5, 'America/Rio_Branco', '<-05>5', 'ACDT', 'ACT'),
	(51, -4, 'America/Boa_Vista', '<-04>4', 'AMST', 'AMT'),
	(52, -4, 'America/Campo_Grande', '<-04>4', 'AMST', 'AMT'),
	(53, -4, 'America/Manaus', '<-04>4', 'AMST', 'AMT'),
	(54, -4, 'America/Porto_Velho', '<-04>4', 'AMST', 'AMT'),
	(55, -3, 'America/Bahia', '<-03>3', 'BRST', 'BRT'),
	(56, -3, 'America/Recife', '<-03>3', 'BRST', 'BRT');

ALTER TABLE CLUNITS ADD CONSTRAINT CLUNITS_fk_TIMEZONE_ID FOREIGN KEY (TIMEZONE_ID) REFERENCES TIME_ZONES(ID);

ALTER TABLE DEVICES ADD COLUMN LTE_ICCID varchar(100) DEFAULT NULL;
ALTER TABLE DEVICES ADD COLUMN LTE_NETWORK varchar(100) DEFAULT NULL; 
ALTER TABLE DEVICES ADD COLUMN LTE_RSRP INT DEFAULT NULL;
ALTER TABLE DEVICES ADD COLUMN LTE_OPERATOR varchar(100) DEFAULT NULL; 

-- $$ --

ALTER TABLE DMTS_NOBREAK_CIRCUITS
ADD CONSTRAINT DMTS_NOBREAK_CIRCUITS_uk_DMT_ID UNIQUE (DMT_ID);