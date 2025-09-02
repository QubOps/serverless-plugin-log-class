# serverless-plugin-log-class

[![Serverless][ico-serverless]][link-serverless]
[![License][ico-license]][link-license]

## Summary

Serverless Framework plugin to specify a custom log class for AWS Lambda
functions. By default Serverless Framework uses the Standard log class with no
option to change it.

An additional log group will be created for Infrequent Access logs and the
original log group will be maintained but unused.

Supported version of Serverless Framework:

 * 1.70.0+
 * 2.0.0+
 * 3.0.0+

## Usage

Install the plugin via your favourite npm client:

```bash
npm install --save-dev serverless-plugin-log-class
```

Enable the plugin in your `serverless.yml`:

```yaml
plugins:
  - serverless-plugin-log-class
```

Specify the desired log class globally or at function level:

```yaml
custom:
  logClassPlugin:
    logClass: INFREQUENT_ACCESS
```

or

```yaml
functions:
  myFunction:
    handler: handler.myFunction
    logClassPlugin:
        logClass: INFREQUENT_ACCESS
```

Supported log classes:

 * STANDARD (falls back to default serverless behavior)
 * INFREQUENT_ACCESS

## Notes

The plugin will create a new log group for the specified log class. The original
log group will remain but unused.

If you would like to remove the original log group, which would mean losing any
exitsing logs, you can set the following option:

```yaml
custom:
  logClassPlugin:
    preserveDefaultLogGroup: false # default: true
```

And even keep the same name (although old logs will still be lost):

```yaml
custom:
  logClassPlugin:
    preserveDefaultLogGroup: false # default: true
    logGroupNameSuffix: '' # Removes the -ia suffix
```

[ico-license]: https://img.shields.io/badge/license-MIT-blue.svg
[ico-serverless]: https://raw.githubusercontent.com/serverless/artwork/1701ae94377700fde0496890d26a6851720a4f9a/logo-serverless-transparent.png
[link-serverless]: https://www.serverless.com/
[link-license]: ./blob/main/LICENSE
