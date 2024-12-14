INSERT INTO ENERGY_METER_MODELS (MANUFACTURER_ID, NAME) VALUES (3, 'ETE-50');

 -- $$ --

CREATE TABLE SCHNEIDER_PM9C_COMMANDS (
  ADDRESS int unsigned NOT NULL,
  ALIAS varchar(30) DEFAULT NULL,
  COMMAND varchar(20) NOT NULL,
  DESCRIPTION varchar(50) NOT NULL,
  FORMULA varchar(35) DEFAULT NULL,
  FUNC_ID tinyint unsigned NOT NULL,
  ID tinyint unsigned NOT NULL,
  IP varchar(30) DEFAULT NULL,
  HAS_SIGNAL tinyint unsigned NOT NULL,
  R_W varchar(3) NOT NULL,
  SIZE tinyint unsigned NOT NULL,
  SYS_ID tinyint unsigned NOT NULL,
  UNIT varchar(10) DEFAULT NULL,

  PRIMARY KEY (ADDRESS),
  CONSTRAINT SCHNEIDER_PM9C_COMMANDS_uk_ALIAS UNIQUE KEY (ALIAS),
  CONSTRAINT SCHNEIDER_PM9C_COMMANDS_uk_COMMAND UNIQUE KEY (COMMAND)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO SCHNEIDER_PM9C_COMMANDS (COMMAND, ADDRESS, ALIAS, DESCRIPTION, FORMULA, FUNC_ID, ID, IP, R_W, SIZE, SYS_ID, UNIT, HAS_SIGNAL) VALUES
('CMN0', '1038', 'en_at_tri', 'Energia Ativa Total', NULL, '3', '1', NULL, 'R', '2', '0', 'kWh', 0),
('CMN1', '1040', 'en_re_tri', 'Energia Reativa Total ', NULL, '3', '1', NULL, 'R', '2', '0', 'kVArh', 0),
('CMN2', '1022', 'pot_at_tri', 'Potência Ativa Total', '/100', '3', '1', NULL, 'R', '2', '0', 'kW', 1),
('CMN3', '1026', 'pot_ap_tri', 'Potência Aparente Total', '/100', '3', '1', NULL, 'R', '2', '0', 'kVA', 0),
('CMN4', '1024', 'pot_re_tri', 'Potência Reativa Total', '/100', '3', '1', NULL, 'R', '2', '0', 'kVAr', 1),
('CMN5', '1030', 'fp', 'Fator de Potência Total', NULL, '3', '1', NULL, 'R', '2', '0', NULL, 0),
('CMN6', '1020', 'freq', 'Frequência', '/100', '3', '1', NULL, 'R', '2', '0', 'Hz', 0),
('CMN7', '1032', 'demanda_med_at', 'Demanda Média Potência Ativa', '/100', '3', '1', NULL, 'R', '2', '0', 'kW', 0),
('CMN8', '1000', 'i_a', 'Corrente de Fase I1', '/1000', '3', '1', NULL, 'R', '2', '0', 'A', 0),
('CMN9', '1002', 'i_b', 'Corrente de Fase I2', '/1000', '3', '1', NULL, 'R', '2', '0', 'A', 0),
('CMN10', '1004', 'i_c', 'Corrente de Fase I3', '/1000', '3', '1', NULL, 'R', '2', '0', 'A', 0),
('CMN11', '1014', 'v_a', 'Tensão de Fase L1-N', '/1000', '3', '1', NULL, 'R', '2', '0', 'V', 0),
('CMN12', '1016', 'v_b', 'Tensão de Fase L2-N', '/1000', '3', '1', NULL, 'R', '2', '0', 'V', 0),
('CMN13', '1018', 'v_c', 'Tensão de Fase L3-N', '/1000', '3', '1', NULL, 'R', '2', '0', 'V', 0),
('CMN14', '1008', 'v_ab', 'Tensão de Linha L1-L2', '/1000', '3', '1', NULL, 'R', '2', '0', 'V', 0),
('CMN15', '1010', 'v_bc', 'Tensão de Linha L2-L3', '/1000', '3', '1', NULL, 'R', '2', '0', 'V', 0),
('CMN16', '1012', 'v_ca', 'Tensão de Linha L3-L1', '/1000', '3', '1', NULL, 'R', '2', '0', 'V', 0),
('CMN17', '1044', 'pot_at_a', 'Potência Ativa Fase 1', '/100', '3', '1', NULL, 'R', '2', '0', 'kW', 1),
('CMN18', '1046', 'pot_at_b', 'Potência Ativa Fase 2', '/100', '3', '1', NULL, 'R', '2', '0', 'kW', 1),
('CMN19', '1048', 'pot_at_c', 'Potência Ativa Fase 3', '/100', '3', '1', NULL, 'R', '2', '0', 'kW', 1);


INSERT INTO ENERGY_METER_MODELS (MANUFACTURER_ID, NAME) VALUES (3, 'Schneider PM9C');
