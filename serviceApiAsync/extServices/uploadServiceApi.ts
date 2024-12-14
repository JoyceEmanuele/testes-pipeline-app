import axios, { AxiosResponse, AxiosRequestConfig, Method } from 'axios'
import { logger } from '../../srcCommon/helpers/logger'
import servConfig from '../../configfile'
import * as FormData from 'form-data'
import * as fs from 'node:fs'

function checkAxiosError(err: any): AxiosResponse {
  if (err && err.isAxiosError) {
    delete err.request
    if (err.response) {
      delete err.response.request
      delete err.response.config
    }
    logger.error({
      message: 'Erro ao buscar informações do Upload Service)',
      err: `${err && (err as Error).message || 'ERROR EXT_API_UPLOAD_SERVICE_HTTP'}`
    });
    throw Error('erro ao buscar informações do Upload Service')
      .HttpStatus(500)
      .DebugInfo({ errorCode: 'EXT_API_UPLOAD_SERVICE_HTTP' })
  }
  throw err
}

async function uploadServiceAPI(
  route: string,
  method: Method,
  body?: any,
  authHeader?: string,
  file?: Express.Multer.File
) {
  const formData = new FormData();
  if (file) {
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
  }

  if (body) {
    Object.keys(body).forEach((key) => {
      formData.append(key, String(body[key]));
    });
  }

  const config: AxiosRequestConfig = {
    method: method,
    baseURL: servConfig.uploadServiceAPI + route,
    data: file ? formData : body, // Set form data as the request body
    headers: {
      'Content-Type': file ? 'multipart/form-data' : 'application/json',
      ...(authHeader && { Authorization: `${authHeader}` }),
    },
  };
  
  return axios(config).catch(checkAxiosError)
}

const apiUploadService = {
  ['POST /upload-service/upload-image']:
    async function (reqParams: {
      referenceId: number
      referenceType: string
      file: Express.Multer.File
    },
    authHeader: string) {
      const response = await uploadServiceAPI(
        '/upload-service/upload-image',
        'POST',
        {
          referenceId: reqParams.referenceId,
          referenceType: reqParams.referenceType,
        },
        authHeader,
        reqParams.file
      )
      return response.data
    },

  ['POST /upload-service/get-images']: async function (
    reqParams: {
      referenceId: number
      referenceType: string
    },
    authHeader: string
  ) {
    const response = await uploadServiceAPI(
      '/upload-service/get-images',
      'POST',
      {
        referenceId: reqParams.referenceId,
        referenceType: reqParams.referenceType,
      },
      authHeader
    )
    return response.data
  },

  ['POST /upload-service/delete-image']: async function (
    reqParams: {
      referenceId: number,
      referenceType: string,
      filename: string,
    },
    authHeader: string
  ) {
    const response = await uploadServiceAPI(
      '/upload-service/delete-image',
      'POST',
      {
        referenceId: reqParams.referenceId,
        referenceType: reqParams.referenceType,
        filename: reqParams.filename,
      },
      authHeader
    )
    return response.data
  },

  ['POST /upload-service/upload-sketch']: async function (
    reqParams: {
      unitId: number,
      isVisible: boolean,
      nameSketch: string,
      file: Express.Multer.File
    },
    authHeader: string
  ) {
    const response = await uploadServiceAPI(
      '/upload-service/upload-sketch',
      'POST',
      {
        unitId: reqParams.unitId,
        isVisible: reqParams.isVisible,
        nameSketch: reqParams.nameSketch,
      },
      authHeader,
      reqParams.file
    )
    return response.data
  },

  ['POST /upload-service/get-sketches-list']: async function (
    reqParams: {
      unitId: number
    },
    authHeader: string
  ) {
    const response = await uploadServiceAPI(
      '/upload-service/get-sketches-list',
      'POST',
      {
        unitId: reqParams.unitId,
      },
      authHeader
    )
    return response.data
  },

  ['POST /upload-service/delete-sketch']: async function (
    reqParams: {
      unitId: number,
      filename: string
    },
    authHeader: string
  ) {
    const response = await uploadServiceAPI(
      '/upload-service/delete-sketch',
      'POST',
      {
        unitId: reqParams.unitId,
        filename: reqParams.filename,
      },
      authHeader
    )
    return response.data
  },

  ['POST /upload-service/edit-sketch']: async function (
    reqParams: {
      sketchList: {
        unitSketchId: number;
        filename: string;
        isVisible: boolean;
        nameSketch: string;
      }[],
      unitId: number
    },
    authHeader: string
  ) {
    const response = await uploadServiceAPI(
      '/upload-service/edit-sketch',
      'POST',
      {
        sketchList: reqParams.sketchList,
        unitId: reqParams.unitId,
      },
      authHeader
    )
    return response.data
  },

  ['POST /upload-service/download-sketches']: async function (
    reqParams: {
      unitId: number,
      unitSketchId: number,
      filename: string,
    },
    authHeader: string
  ) {
    const response = await uploadServiceAPI(
      '/upload-service/download-sketches',
      'POST',
      {
        unit_id: reqParams.unitId,
        UNIT_SKETCH_ID: reqParams.unitSketchId,
        FILENAME: reqParams.filename,
      },
      authHeader
    )
    return response.data
  },
}

export { apiUploadService }
