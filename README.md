# Document Classifier Backend for Dialogflow CX
 
This is a **Node.js** backend that integrates with **Dialogflow CX** and **Google Document AI** to classify and extract information from documents received via **Facebook Messenger**. It uses **Google Cloud Storage** for document handling. This is only an extract from the complete project as the whole project also involves usage of databases for products and Dialogflow CX digital assistant.

## Features
* Accepts Documents via Facebook Messenger.
* Saves documents to Google Cloud Storage.
* Classifies documents using **Google Document AI**.
* Extract relevant information based on document received.
* It returns the read data to the user to verify the data was read properly.

## Technologies Used
* **NodeJS**
* **ExpressJS**
* **Google Cloud Storage**
* **Google Document AI**
* **Facebook Messenger API**

## How it works
1. User sends a document via Facebook Messenger.
2. This document is downloaded and stored in Google Cloud Storage.
3. **Google Document AI** then classifies the document (it can read Mexican ID, Electricity Bill, Telephone Bill).
4. We extract the key details and label them in order to have them for any later use.

## Webhook
A webhook is a way for applications to communicate fast and in real-time. It allows an external service like Facebook Messenger to send data automatically to your backend when a specific event occurs. This implementation of webhook endpoint listens for messages received via **Facebook Messenger**.

Watch how the complete project works: [![Chatbot Demo](https://drive.google.com/uc?export=view&id=1zk8982E92ldmqmwzSyAshwe7fLl9ZEuD)](https://drive.google.com/file/d/1zk8982E92ldmqmwzSyAshwe7fLl9ZEuD/view?usp=sharing)

## License

MIT License

Copyright (c) [2025] [Mauricio Juarez Sanchez]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
