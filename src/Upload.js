class Upload {
  constructor(file, name = null) {
    this.file = file;
    this.name = name;
  }

  getFile() {
    return this.file;
  }

  getName() {
    return this.name;
  }
}

module.exports = Upload;
