const Error = require("./Error");

// methods are called json() and data() instead of verbs to keep consistency with global Response methods like json() or text()

class Response {
  constructor(response) {
    this.response = response;
  }

  json() {
    return this.response;
  }

  /*
  
  convert this.response to a more readable object

  input:
  
    {
      data: {
        user: {
          data: {
            id: "1",
            name: "Jhon Doe",
          },
          error: null
        },
      },
      error: null
    }

  output:
  
    {
      user: {
        id: "1",
        name: "Jhon Doe"
      }
    }

  throws an Error if there's any error in this.response

  */

  data() {
    if (this.response.error !== null) {
      throw new Error(this.response.error.code, this.response.error.message);
    }

    /*
    
    if response.data is null, it means two things:

    - it's a subscription response
    - we can emit the "success" event for the subscription

    */

    if (this.response.data === null) {
      return null;
    }

    const data = {};

    for (const key in this.response.data) {
      const result = this.response.data[key];

      if (result.error !== null) {
        throw new Error(result.error.code, result.error.message);
      }

      data[key] = result.data;
    }

    return data;
  }
}

module.exports = Response;
