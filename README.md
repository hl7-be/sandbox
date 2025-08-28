# FHIR Server and Document Server

This setup contains two servers:

1. **FHIR Server**: A server for hosting and validating FHIR content. The server is preloaded with the IPS (International Patient Summary) specification...
2. **Document Server**: A simple server to act as a document repository.

## FHIR Server
Hosts and validates FHIR content.  
  - Landing page: [http://localhost:8080/web/apps/index.html](http://localhost:8080/web/apps/index.html)
  - Generic resource validator: [http://localhost:8080/web/apps/validator/index.html](http://localhost:8080/web/apps/validator/index.html)
  - FHIR endpoint: [http://localhost:8080/fhir](http://localhost:8080/fhir)

## Document Server
Provides a simple document repository.
- **Usage**:
  - Upload documents via `POST /documents`
  - Retrieve documents via `GET /documents/<filename>`

### How to Use the Document Server

1. **Start the Servers**
   Run the following command to start the FHIR server and document server:
   ```bash
   docker-compose up -d
   ```

2. **Upload a Document**  
   ```bash
   curl -X POST -F "file=@example.pdf" http://localhost:8081/documents
   ```

3. **Retrieve a Document**  
   ```bash
   curl -O http://localhost:8081/documents/example.pdf
   ```

4. **Directory for Uploaded Files**
   Uploaded files are stored in the `./documents` directory on the host machine.
