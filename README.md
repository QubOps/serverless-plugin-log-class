# serverless-plugin-log-class

## Summary

Serverless Framework plugin to specify a custom log class for AWS Lambda
functions. By default Serverless Framework uses the Standard log class with no
option to change it.

An additional log group will be created for Infrequent Access logs and the
original log group will be maintained but unused.

Supported version of Serverless Framework:

 * 1.70.0+
