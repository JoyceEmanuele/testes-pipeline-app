import * as multer from 'multer'
import * as express from 'express'

import { logger } from '../../srcCommon/helpers/logger';

const fileUploadMW = multer({
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MiB
  storage: multer.memoryStorage()
  // When using memory storage, the file info will contain a field called buffer that contains the entire file.
}).single('file') // .array('file', 3)

export function getUploadedFile (req: express.Request, res: express.Response, optional?: boolean): Promise<Buffer> { // Express.Multer.File
  return new Promise((resolve, reject) => {
    fileUploadMW(req, res, (err: any) => {
      if (err) {
        logger.info("Error uploading data (multer): ", err)
        return reject(Error('Error uploading data').HttpStatus(400))
      }
      if ((!req.file) && (req.files instanceof Array) && (req.files.length === 1)) {
        req.file = req.files[0]
      }
      if (!req.file && optional === true) {
        return resolve(null)
      }
      if (!req.file) {
        logger.info({ body: req.body, file: req.file, files: req.files })
        return reject(Error('Missing "file"').HttpStatus(400))
      }
      return resolve(req.file && req.file.buffer)
    })
  })
}

const photoUploadMW = multer({
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MiB
  storage: multer.memoryStorage()
  // When using memory storage, the file info will contain a field called buffer that contains the entire file.
}).single('photo') // .array('photos', 3)

export function getUploadedPhoto (req: express.Request, res: express.Response): Promise<Buffer> { // Express.Multer.File
  return new Promise((resolve, reject) => {
    photoUploadMW(req, res, (err: any) => {
      if (err) {
        logger.info("Error uploading data (multer): ", err)
        return reject(Error('Error uploading data').HttpStatus(400))
      }
      if ((!req.file) && (req.files instanceof Array) && (req.files.length === 1)) {
        req.file = req.files[0]
      }
      if (!req.file) {
        logger.info({ body: req.body, file: req.file, files: req.files })
        return reject(Error('Missing "file"').HttpStatus(400))
      }
      return resolve(req.file && req.file.buffer)
    })
  })
}

export function getUploadedPhotoAsFile (req: express.Request, res: express.Response): Promise<Express.Multer.File> { // Express.Multer.File
  return new Promise((resolve, reject) => {
    photoUploadMW(req, res, (err: any) => {
      if (err) {
        logger.info("Error uploading data (multer): ", err)
        return reject(Error('Error uploading data').HttpStatus(400))
      }
      if ((!req.file) && (req.files instanceof Array) && (req.files.length === 1)) {
        req.file = req.files[0]
      }
      if (!req.file) {
        logger.info({ body: req.body, file: req.file, files: req.files })
        return reject(Error('Missing "file"').HttpStatus(400))
      }
      return resolve(req.file)
    })
  })
}

export function getUploadedGeneric(
  req: express.Request,
  res: express.Response,
  multerMW: express.RequestHandler,
) {
  return new Promise<{
    files: {
      [k: string]: {
        /** Name of the form field associated with this file. */
        fieldname: string;
        /** Name of the file on the uploader's computer. */
        originalname: string;
        /** Value of the `Content-Type` header for this file. */
        mimetype: string;
        /** Size of the file in bytes. */
        size: number;
        /** `MemoryStorage` only: A Buffer containing the entire file. */
        buffer: Buffer;
      }[],
    }
    body: {
      [k: string]: string[] | string
    }
  }>((resolve, reject) => {
    multerMW(req, res, (err: any) => {
      if (err) {
        logger.info("Error uploading data (multer): ", err)
        return reject(Error('Error uploading data').HttpStatus(400))
      }

      const files = {} as {
        [k: string]: {
          fieldname: string;
          originalname: string;
          mimetype: string;
          size: number;
          buffer: Buffer;
        }[],
      };

      if (req.files && (req.files instanceof Array)) {
        for (const file of req.files) {
          if (!files[file.fieldname]) files[file.fieldname] = [];
          files[file.fieldname].push(file);
        }
      } else if (req.files) {
        for (const [name, files] of Object.entries(req.files)) {
          if (files instanceof Array) {
            for (const file of files) {
              if (!files[file.fieldname]) files[file.fieldname] = [];
              files[file.fieldname].push(file);
            }
          }
        }
      } else if (req.file) {
        const file = req.file;
        if (!files[file.fieldname]) files[file.fieldname] = [];
        files[file.fieldname].push(file);
      }

      const body = req.body as {
        [k: string]: string
      };

      return resolve({ files, body });
    })
  });
}
