const {Storage} = require('@google-cloud/storage');
const {DocumentProcessorServiceClient} = require('@google-cloud/documentai').v1beta3;
const axios = require('axios');
const stream = require('stream');
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

// Creates a client
const storage = new Storage();

const entityNameMapping = {
  'INE': 'National Electoral Institute ID',
  'ReciboLuz': 'Electricity Bill',
  'ConstanciaFiscal': 'Fiscal Certificate',
  'ReciboTelefono': 'Telephone Bill',
  // Add more mappings as needed
};

const ineEntityNameMapping = {
  'birthDate': 'Fecha de Nacimiento',
  'claveElector': 'Clave de Elector',
  'CURP': 'Código Único de Registro de Población (CURP)',
  'Domicilio': 'Domicilio',
  'edad': 'Edad',
  'id': 'ID',
  'Name': 'Nombre',
  'ocr': 'Texto OCR',
  'Surname1': 'Apellido Paterno',
  'Surname2': 'Apellido Materno',
  'vigencia': 'Vigencia',
  // Add more mappings as needed
};

const constanciaFiscalEntityNameMapping = {
  'CURP': 'Código Único de Registro de Población (CURP)',
  'Nombre': 'Name',
  'PrimerApellido': 'First Surname',
  'RFC': 'Federal Taxpayer Registry (RFC)',
  'SegundoApellido': 'Second Surname',
  // Add more mappings as needed
};

// Define the order of the entities
const entityOrder = [
  'Nombre',
  'Apellido Paterno',
  'Apellido Materno',
  'Fecha de Nacimiento',
  'Domicilio',
  'ID',
  'Clave de Elector',
  'Vigencia',
  'Código Único de Registro de Población (CURP)'
];

// Define the order of the entities for ConstanciaFiscal
const constanciaFiscalEntityOrder = [
  'Nombre',
  'PrimerApellido',
  'SegundoApellido',
  'Código Único de Registro de Población (CURP)',
  'Federal Taxpayer Registry (RFC)'
];

async function saveToBucket(bucketName, url, destinationBlobName, senderId, pageId) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destinationBlobName);

  // Get the file from the URL
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  const reader = response.data.pipe(new stream.PassThrough());

  // Uploads a local file to the bucket
  await new Promise((resolve, reject) =>
    reader.pipe(file.createWriteStream()).on('error', reject).on('finish', resolve)
  );
  
  // Download the file locally
  const localFilePath = path.join('./', destinationBlobName);
  await file.download({destination: localFilePath});

  // Classify the document
  const highestConfidenceLabel = await classifyDocument(bucketName, destinationBlobName, 'documentprincipal', 'us', '55a75bdc6e121275');

  // Now you can use highestConfidenceLabel for further processing
  console.log(`Highest confidence label: ${highestConfidenceLabel}`);

  // Determine the custom extractor ID based on the highestConfidenceLabel
  let customExtractorId;
  switch (highestConfidenceLabel) {
    case 'INE':
      customExtractorId = '9a8c87892a6f4500';
      break;
    case 'ReciboLuz':
      customExtractorId = 'f1cfac8adff82562';
      break;
    case 'ConstanciaFiscal':
      customExtractorId = '10d09c4cbadab226';
      break;
    case 'ReciboTelefono':
      customExtractorId = '328004a6d5b483e1';
      break;
    default:
      throw new Error(`Unsupported label: ${highestConfidenceLabel}`);
  }

  // Process the document with the custom extractor
  const document = await processDocumentWithCustomExtractor('documentprincipal', 'us', customExtractorId, destinationBlobName);

  let entities;
  if (highestConfidenceLabel === 'INE') {
    // Sort the entities based on the defined order
    const sortedEntities = document.entities.sort((a, b) => entityOrder.indexOf(a.type) - entityOrder.indexOf(b.type));
    entities = sortedEntities.map(entity => `${ineEntityNameMapping[entity.type] || entity.type}: ${entity.mentionText}`);
  } else if (highestConfidenceLabel === 'ConstanciaFiscal') {
    // Sort the entities based on the defined order for ConstanciaFiscal
    const sortedEntities = document.entities.sort((a, b) => constanciaFiscalEntityOrder.indexOf(a.type) - constanciaFiscalEntityOrder.indexOf(b.type));
    entities = sortedEntities.map(entity => `${constanciaFiscalEntityNameMapping[entity.type] || entity.type}: ${entity.mentionText}`);
  } else {
    entities = document.entities.map(entity => `${entityNameMapping[entity.type] || entity.type}: ${entity.mentionText}`);
  }
  const formattedEntities = entities.join('\n');
  console.log('Entities:\n', formattedEntities);

  // Send a response back to the user
  const messageText = `Your document was identified as your ${entityNameMapping[highestConfidenceLabel] || highestConfidenceLabel}\nThe content of your document is the following:\n${formattedEntities}`;
  await sendResponse(senderId, pageId, messageText);
}

async function classifyDocument(bucketName, fileName, projectId, location, processorId) {
  // Instantiates a client
  const client = new DocumentProcessorServiceClient();

  // The full resource name of the processor, e.g.:
  // projects/project-id/locations/location/processors/processor-id
  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

  // Read the file into memory.
  const file = fs.readFileSync(fileName);

  // Convert the file to base64.
  const inputConfig = {
    mimeType: 'application/pdf',
    content: file.toString('base64'),
  };

  const request = {
    name,
    rawDocument: inputConfig,
  };

  // Process the document
  const [result] = await client.processDocument(request);

  // Find the entity with the highest confidence score
  let highestConfidenceEntity = result.document.entities[0];
  for (const entity of result.document.entities) {
    if (entity.confidence > highestConfidenceEntity.confidence) {
      highestConfidenceEntity = entity;
    }
  }

  // Print the classification label and confidence score of the entity with the highest confidence score
  console.log(`Classification label with highest confidence: ${highestConfidenceEntity.type}`);
  console.log(`Confidence score: ${highestConfidenceEntity.confidence}`);

  // Return the classification label with the highest confidence score
  return highestConfidenceEntity.type;
}

async function processDocumentWithCustomExtractor(projectId, location, processorId, filePath) {
  const documentaiClient = new DocumentProcessorServiceClient();
  const resourceName = documentaiClient.processorPath(projectId, location, processorId);
  const imageFile = fs.readFileSync(filePath);
  const extension = filePath.split('.').pop();
  let mimeType;
  switch (extension) {
    case 'pdf':
      mimeType = 'application/pdf';
      break;
    case 'png':
      mimeType = 'image/png';
      break;
    case 'jpg':
    case 'jpeg':
      mimeType = 'image/jpeg';
      break;
    case 'tiff':
      mimeType = 'image/tiff';
      break;
    default:
      throw new Error(`Unsupported file extension: ${extension}`);
  }
  const rawDocument = {
    content: imageFile,
    mimeType: mimeType,
  };
  const request = {
    name: resourceName,
    rawDocument: rawDocument
  };
  const [result] = await documentaiClient.processDocument(request);

  // Delete the file
  fs.unlinkSync(filePath);

  return result.document;
}

async function sendResponse(psid, pageId, messageText) {
  /*const url = `https://graph.facebook.com/v13.0/me/messages?access_token=EAAKExSNuM4MBO93qB4qZCb2g29LfqLYnzn7i7U1qR2mVQNObgigpf9wmg4xnOa0zai9eYU7T1SRhcVKXohZAsA4DspXT5ecAIbySZCyblRBQYrCXNshf2gkjFHiuEKyNW0I7MIuXiHTFZCoPzfIDXei3meJ8gtX7wXxEbDpQKCHEwvCVYXx0JvgSYRreLVW3T75LxrQ6`;*/
  const url = `https://graph.facebook.com/v13.0/me/messages?access_token=EAAt6yn8KTwoBO7XB6lrUDw7pBTkhPZAq4LLCuln3MFRHWiWeDyZAtc9V7yHUC7g63Vv8ZCUZBElG0yL9mameGU6qt1w4sgH5P5YWj4fRKdvdCPZAXNUl1rK6rvDbs46Y01C9SpIhFfqADMJeNZBFhPEw5fNcUvV9mYUcmmZAIGIjOlnGvXGfZBUsclBrC9gZBZBQ8U5r5jySAAWs4vOXRw`;
  const payload = {
    recipient: {
      id: psid
    },
    message: {
      text: messageText
    }
  };
  await axios.post(url, payload);
}

app.post('/webhook', async (req, res) => {
  // Extract the Facebook data from the incoming request
  const facebookData = req.body.payload.data;
  const senderId = facebookData.sender.id;
  const pageId = facebookData.recipient.id;
  const message = facebookData.message;
  const attachments = message.attachments;
  console.log(facebookData)
  console.log('Sender PSID:', senderId);

  // Loop through each attachment and log the URL
  const promises = attachments.map((attachment) => {
    const filePayload = attachment.payload;
    const url = filePayload.url;
    console.log('File URL:', url);

    const bucketName = 'mybucket124';  // TODO: replace with your bucket name
    const destinationBlobName = 'test.pdf';  // TODO: replace with

    return saveToBucket(bucketName, url, destinationBlobName, senderId, pageId);
  });

  try {
    await Promise.all(promises);
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.listen(3000, () => {
  console.log('Webhook is running on port 3000');
});
