# Neo4j Demo

A Node.js CLI application demonstrating Neo4j graph database integration with a focus on recommendations and data management.

## 🚀 Features

- Interactive CLI interface for Neo4j operations
- Recommendation system implementation
- Docker-based Neo4j database setup
- Data management and backup capabilities

## 📋 Prerequisites

- Node.js (Latest LTS version recommended)
- Docker and Docker Compose
- Git

## 🛠️ Installation

1. Clone the repository:

```bash
git clone https://github.com/tomsl123/neo4j-demo.git
cd neo4j-demo
```

2. Install dependencies:

```bash
npm install
```

3. Start the Neo4j database:

```bash
docker-compose up -d
```

## 🔧 Configuration

The application uses environment variables for configuration. Create a `.env` file in the root directory with the following variables:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

## 🚀 Usage

Run the CLI application:

```bash
npm run cli
```

## 📦 Project Structure

- `/cli` - Command-line interface implementation
- `/db` - Database connection and query utilities
- `/recommendations` - Recommendation system implementation
- `/neo4j` - Neo4j database files and configurations

## 🔍 Neo4j Browser

Access the Neo4j Browser at: http://localhost:7474

- Default credentials:
  - Username: neo4j
  - Password: password

## 📚 Database Management

### Backup

To create a database backup:

```bash
docker-compose --profile admin run neo4j-admin neo4j-admin dump --database=neo4j > neo4j.dump
```

### Restore

To restore from a backup:

```bash
docker-compose --profile admin run neo4j-admin neo4j-admin load --from-path=/backup/neo4j.dump --database=neo4j
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the ISC License.
