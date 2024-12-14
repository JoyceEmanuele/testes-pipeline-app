-- $$ --
ALTER TABLE DAMS_AUTOMATIONS ADD READ_DUT_TEMPERATURE_FROM_BROKER BOOLEAN DEFAULT FALSE;

-- $$ --
ALTER TABLE cache_cond_tel ADD COLUMN last_calculated_date VARCHAR(255) NULL;
CREATE UNIQUE INDEX idx_unique_devId_YMD_last_calculated_date 
ON cache_cond_tel(devId, YMD, last_calculated_date);

-- $$ --
DELETE FROM ETE_30_COMMANDS;

ALTER TABLE ETE_30_COMMANDS MODIFY COLUMN FORMULA VARCHAR(35);

insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN0', null, 1, 80, 'Primário do TC', null, 1, 1, 3, 'R', null, null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN1', null, 1, 81, 'Número de casas decimais para o TC', null, 1, 1, 3, 'R', null, null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN2', null, 1, 82, 'Ordem de grandeza para o TC', null, 1, 1, 3, 'R', null, null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN3', null, 1, 83, 'Primário do TP', null, 1, 1, 3, 'R', null, null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN4', null, 1, 84, 'Número de casas decimais para o TP', null, 1, 1, 3, 'R', null, null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN5', null, 1, 85, 'Ordem de grandeza para o TP', null, 1, 1, 3, 'R', null, null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN6', null, 1, 86, 'Potência nominal', null, 1, 1, 3, 'R', null, null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN7', null, 1, 87, 'Número de casas decimais da potência', null, 1, 1, 3, 'R', null, null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN8', null, 1, 88, 'Ordem de grandeza da potência', null, 1, 1, 3, 'R', null, null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN9', null, 1, 97, 'Campo de energia', null, 1, 1, 3, 'R', null, null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN10', 'v_a', 1, 100, 'Tensão L1 e Neutro', null, 1, 1, 3, 'R', 'V', '*(CMN3*(10^(CMN5-CMN4)))/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN11', 'v_b', 1, 101, 'Tensão L2 e Neutro', null, 1, 1, 3, 'R', 'V', '*(CMN3*(10^(CMN5-CMN4)))/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN12', 'v_c', 1, 102, 'Tensão L3 e Neutro', null, 1, 1, 3, 'R', 'V', '*(CMN3*(10^(CMN5-CMN4)))/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN13', 'i_a', 1, 106, 'Corrente I1', null, 1, 1, 3, 'R', 'A', '*(CMN0*(10^(CMN2-CMN1)))/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN14', 'i_b', 1, 107, 'Corrente I2', null, 1, 1, 3, 'R', 'A', '*(CMN0*(10^(CMN2-CMN1)))/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN15', 'i_c', 1, 108, 'Corrente I3', null, 1, 1, 3, 'R', 'A', '*(CMN0*(10^(CMN2-CMN1)))/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN16', 'pot_at_a', 1, 110, 'Potência Ativa P1', null, 1, 1, 3, 'R', 'W', '*(CMN6*(10^(CMN8-CMN7)))/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN17', 'pot_at_b', 1, 111, 'Potência Ativa P2', null, 1, 1, 3, 'R', 'W', '*(CMN6*(10^(CMN8-CMN7)))/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN18', 'pot_at_c', 1, 112, 'Potência Ativa P3', null, 1, 1, 3, 'R', 'W', '*(CMN6*(10^(CMN8-CMN7)))/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN19', 'pot_at_tri', 1, 113, 'Potência Ativa Total PT', null, 1, 1, 3, 'R', 'W', '*3*(CMN6*(10^(CMN8-CMN7)))/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN20', 'pot_re_tri', 1, 117, 'Potência Reativa Total QT', null, 1, 1, 3, 'R', 'VAr', '*3*(CMN6*(10^(CMN8-CMN7)))/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN21', 'pot_ap_tri', 1, 121, 'Potência Aparente Total', null, 1, 1, 3, 'R', 'VA', '*3*(CMN6*(10^(CMN8-CMN7)))/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN22', 'fp_a', 1, 122, 'Fator de Potência 1', null, 1, 1, 3, 'R', null, '/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN23', 'fp_b', 1, 123, 'Fator de Potência 2', null, 1, 1, 3, 'R', null, '/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN24', 'fp_c', 1, 124, 'Fator de Potência 3', null, 1, 1, 3, 'R', null, '/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN25', 'fp', 1, 125, 'Fator de Potência T', null, 1, 1, 3, 'R', null, '/16384');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN26', 'freq', 1, 126, 'Frequência', null, 1, 1, 3, 'R', 'Hz', '*50/8192');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN27', null, 1, 127, 'Energia ativa importada em MWh', null, 1, 1, 3, 'R', 'MWh', null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN28', 'en_at_tri', 1, 128, 'Energia ativa importada em kWh (referência)', null, 1, 1, 3, 'R', 'KWh', '+((CMN27)*1000+((CMN29)/1000))');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN29', null, 1, 129, 'Energia ativa importada em Wh', null, 1, 1, 3, 'R', 'Wh', null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN30', null, 1, 130, 'Energia reativa importada em MVArh', null, 1, 1, 3, 'R', 'MVArh', null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN31', 'en_re_tri', 1, 131, 'Energia reativa importada em kVArh (referência)', null, 1, 1, 3, 'R', 'KVArh', '+((CMN30)*1000+(CMN32)/1000)');
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN32', null, 1, 132, 'Energia reativa importada em VArh', null, 1, 1, 3, 'R', 'VArh', null);
insert into ETE_30_COMMANDS (COMMAND, ALIAS, SYS_ID, ADDRESS, DESCRIPTION, IP, ID, size, FUNC_ID, R_W, UNIT, FORMULA) VALUES('CMN33', 'demanda', 1, 146, 'Demanda de Potência Ativa', null, 1, 1, 3, 'R', 'W', '*3*(CMN6*(10^(CMN8-CMN7)))/16384');

alter table ETE_30_COMMANDS add column HAS_SIGNAL char(1) DEFAULT '0';
update ETE_30_COMMANDS set HAS_SIGNAL = '1' where COMMAND in ('CMN16', 'CMN17', 'CMN18', 'CMN19', 'CMN20', 'CMN21', 'CMN22', 'CMN23', 'CMN24', 'CMN25');
update ETE_30_COMMANDS set UNIT = 'kW', FORMULA = '*(CMN6*(10^(CMN8-CMN7)))/16384000' where COMMAND in ('CMN16', 'CMN17', 'CMN18');
update ETE_30_COMMANDS set UNIT = 'kW', FORMULA = '*3*(CMN6*(10^(CMN8-CMN7)))/16384000' where COMMAND = 'CMN19';
update ETE_30_COMMANDS set UNIT = 'kVAr', FORMULA = '*3*(CMN6*(10^(CMN8-CMN7)))/16384000' where COMMAND = 'CMN20';
update ETE_30_COMMANDS set UNIT = 'kVA', FORMULA = '*3*(CMN6*(10^(CMN8-CMN7)))/16384000' where COMMAND = 'CMN21';
<<<<<<< HEAD
update ETE_30_COMMANDS set UNIT = 'kW', FORMULA = '*3*(CMN6*(10^(CMN8-CMN7)))/16384000' where COMMAND = 'CMN33';
update ETE_30_COMMANDS set HAS_SIGNAL = '1', UNIT = 'kW', FORMULA = '*3*(CMN6*(10^(CMN8-CMN7)))/16384000' where COMMAND = 'CMN33';

-- $$ --
UPDATE CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS SET UNIT = NULL WHERE ALIAS LIKE 'EMSTOP';

UPDATE CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS SET DESCRIPTION = 'Pressão de Óleo Compressor A' WHERE ALIAS LIKE 'OP_A';
UPDATE CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS SET DESCRIPTION_EN = 'Oil Pressure A' WHERE ALIAS LIKE 'OP_A';
UPDATE CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS SET UNIT = 'kpa' WHERE ALIAS LIKE 'OP_A';

UPDATE CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS SET DESCRIPTION = 'Pressão de Óleo Compressor B' WHERE ALIAS LIKE 'OP_B';
UPDATE CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS SET DESCRIPTION_EN = 'Oil Pressure B' WHERE ALIAS LIKE 'OP_B';
UPDATE CHILLER_CARRIER_30XA_XW_XS_XV_COMMANDS SET UNIT = 'kpa' WHERE ALIAS LIKE 'OP_B';
