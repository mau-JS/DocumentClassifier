const {Storage} = require('@google-cloud/storage');
const {DocumentProcessorServiceClient} = require('@google-cloud/documentai').v1beta3;
const axios = require('axios');
const stream = require('stream');
const fs = require('fs');
const path = require('path');

// Creates a client
const storage = new Storage();

async function saveToBucket(bucketName, url, destinationBlobName) {
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
  await classifyDocument(bucketName, destinationBlobName, 'documentprincipal', 'us', '55a75bdc6e121275');
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
}

const bucketName = 'mybucket124';  // TODO: replace with your bucket name
const url = 'https://drive.google.com/uc?export=download&id=1Hrwtmvb_fziWFEJ9iwfV_81mh0zvuMnf';  // TODO: replace with the URL of the file you want to download
const destinationBlobName = 'test.pdf';  // TODO: replace with the name you want to give to the object in your bucket

saveToBucket(bucketName, url, destinationBlobName).catch(console.error);
