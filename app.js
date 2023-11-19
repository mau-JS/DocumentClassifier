const {DocumentProcessorServiceClient} = require('@google-cloud/documentai').v1beta3;
const fs = require('fs');

async function processDocument(projectId = 'documentprincipal', location = 'us', processorId = '55a75bdc6e121275', filePath = '1_updated_ConstanciaFiscalOECG.pdf') {
    // Instantiates a client
    const client = new DocumentProcessorServiceClient();

    // The full resource name of the processor, e.g.:
    // projects/project-id/locations/location/processors/processor-id
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    // Read the file into memory.
    const file = fs.readFileSync(filePath);

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

    // Get the text from the document
    const {text} = result.document;

    console.log(`Document processing completed. The document contains: ${text}`);
}

processDocument();
