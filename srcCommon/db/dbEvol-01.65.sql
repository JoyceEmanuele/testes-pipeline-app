DROP TRIGGER IF EXISTS AFTER_INSERT_DACS_ASSET_HEAT_EXCHANGERS;
DROP TRIGGER IF EXISTS AFTER_DELETE_DACS_ASSET_HEAT_EXCHANGERS;
DROP TRIGGER IF EXISTS AFTER_INSERT_DACS_ASSET_HEAT_EXCHANGERS_HIST;
DROP TRIGGER IF EXISTS AFTER_DELETE_DACS_ASSET_HEAT_EXCHANGERS_HIST;

DELIMITER //
CREATE TRIGGER AFTER_INSERT_DACS_ASSET_HEAT_EXCHANGERS
AFTER INSERT ON DACS_ASSET_HEAT_EXCHANGERS FOR EACH ROW 
BEGIN
  DECLARE _device_code VARCHAR(50);
  SELECT DEVICE_CODE
    INTO _device_code
  FROM DEVICES
       INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = NEW.DAC_DEVICE_ID)
       WHERE DEVICES.ID = DACS_DEVICES.DEVICE_ID;
    INSERT INTO DACS_ASSET_HEAT_EXCHANGERS_HIST (ASSET_HEAT_EXCHANGER_ID, DEVICE_CODE, START_DATE)
    VALUES (NEW.ASSET_HEAT_EXCHANGER_ID, _device_code, CURRENT_TIMESTAMP());
END//
DELIMITER ;



DELIMITER //
CREATE TRIGGER AFTER_DELETE_DACS_ASSET_HEAT_EXCHANGERS
AFTER DELETE ON DACS_ASSET_HEAT_EXCHANGERS FOR EACH ROW
BEGIN
   UPDATE DACS_ASSET_HEAT_EXCHANGERS_HIST HIST
   INNER JOIN CONDENSERS ON (CONDENSERS.ID = OLD.ASSET_HEAT_EXCHANGER_ID)
   INNER JOIN DACS_DEVICES ON (DACS_DEVICES.ID = OLD.DAC_DEVICE_ID)
   INNER JOIN DEVICES ON (DEVICES.ID = DACS_DEVICES.DEVICE_ID)
      SET END_DATE = CURRENT_TIMESTAMP()
   WHERE HIST.DEVICE_CODE = DEVICES.DEVICE_CODE AND CONDENSERS.ID = HIST.ASSET_HEAT_EXCHANGER_ID AND END_DATE IS NULL;
END//
DELIMITER ;

