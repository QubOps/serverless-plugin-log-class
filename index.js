class InfrequentLogsPlugin {

  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.custom = serverless.service.custom || {};
    this.pluginConfig = this.custom.logClassPlugin || {};
    this.pluginConfig.logClass = (this.pluginConfig.logClass || 'STANDARD').toUpperCase();

    this.hooks = {
      'before:deploy:deploy': this.addCustomLogClass.bind(this),
    };
  }

  addCustomLogClass() {
    const cf = this.serverless.service.provider.compiledCloudFormationTemplate;
    cf.Resources = cf.Resources || {};

    Object.keys(this.serverless.service.functions || {}).forEach(functionName => {
      const functionObject = this.serverless.service.functions[functionName];
      
      const functionLogClass = (functionObject.logClass || this.pluginConfig.logClass || 'STANDARD').toUpperCase();
      
      // Use default log groups for STANDARD log class
      if (functionLogClass === 'STANDARD') {
        return;
      }

      const lambdaLogicalId = `${this.getNormalizedFunctionName(functionName)}LambdaFunction`;
      const lambdaObject = cf.Resources[lambdaLogicalId];
      
      if (!lambdaObject) {
        console.warn(`Lambda function ${lambdaLogicalId} not found in CloudFormation template`);
        return;
      }
      
      // Create a new LogGroup logical id to retain any standard logs groups
      const logGroupLogicalId = `${this.getNormalizedFunctionName(functionName)}LogGroupCustom`;
      const logGroupName = this.getFunctionLogGroupName(functionName, functionLogClass);

      cf.Resources[logGroupLogicalId] = {
        Type: 'AWS::Logs::LogGroup',
        Properties: {
          LogGroupName: logGroupName,
          LogGroupClass: functionLogClass,
        },
      };

      // Use same retention settings as function or provider level if set
      const retentionInDays = functionObject.logRetentionInDays || this.serverless.service.provider.logRetentionInDays;
      if (retentionInDays) {
        cf.Resources[logGroupLogicalId].Properties.RetentionInDays = retentionInDays;
      }

      lambdaObject.Properties.LoggingConfig = lambdaObject.Properties.LoggingConfig || {};
      lambdaObject.Properties.LoggingConfig.LogGroup = { Ref: logGroupLogicalId };

      lambdaObject.DependsOn = lambdaObject.DependsOn || [];
      if (Array.isArray(lambdaObject.DependsOn)) {
        lambdaObject.DependsOn.push(logGroupLogicalId);
      } else {
        lambdaObject.DependsOn = [lambdaObject.DependsOn, logGroupLogicalId];
      }

      if (lambdaObject.Properties.Role && lambdaObject.Properties.Role["Fn::GetAtt"]) {
        const lambdaRoleLogicalId = lambdaObject.Properties.Role["Fn::GetAtt"][0];
        const lambdaRoleObject = cf.Resources[lambdaRoleLogicalId];
        
        if (lambdaRoleObject) {
          this.addLogGroupIAMPolicy(lambdaRoleObject,logGroupLogicalId);
        }
      }
    });
  }

  getNormalizedFunctionName(functionName) {
    return functionName.charAt(0).toUpperCase() + functionName.slice(1);
  }

  getFunctionLogGroupName(functionName, logClass) {
    const stage = this.options.stage || this.serverless.service.provider.stage;
    const service = this.serverless.service.service;
    const suffixMap = {
      STANDARD: '',
      INFREQUENT_ACCESS: '-ia',
    }
    const suffix = suffixMap[logClass] || '-custom';
    return `/aws/lambda/${service}-${stage}-${functionName}${suffix}`;
  }

  addLogGroupIAMPolicy(lambdaRoleObject, logGroupLogicalId) {
    if (!lambdaRoleObject.Properties.Policies) {
      lambdaRoleObject.Properties.Policies = [];
    }

    const existingPolicyIndex = lambdaRoleObject.Properties.Policies.findIndex(
      policy => policy.PolicyName === 'LogGroupAccessPolicyCustom'
    );

    const logPolicyStatement = {
      Effect: 'Allow',
      Action: [
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      Resource: {
        'Fn::GetAtt': [logGroupLogicalId, 'Arn']
      }
    };

    if (existingPolicyIndex >= 0) {
      lambdaRoleObject.Properties.Policies[existingPolicyIndex].PolicyDocument.Statement.push(logPolicyStatement);
    } else {
      lambdaRoleObject.Properties.Policies.push({
        PolicyName: 'LogGroupAccessPolicyCustom',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [logPolicyStatement]
        }
      });
    }
  }
}

module.exports = InfrequentLogsPlugin;
