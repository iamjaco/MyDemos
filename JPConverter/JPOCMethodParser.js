//
//
//  JPOCMethodParser.js
//
//  Created by zzyong on 2020/03/20.
//  Copyright © 2020 zzyong. All rights reserved.
//

// 解析 OC 方法
function parseObjectiveCMethod(JPAllInstance, localInstanceKey, statement)
{
  if (statement == null) {
    return null;
  }

  statement = statement.trim().replace(/\\n/igm, "");
  if (statement.length == 0) {
    return null;
  }

  var aspectMessage = JPAspectMessage();

  if (localInstanceKey != null && localInstanceKey.length > 0) {
    aspectMessage["localInstanceKey"] = localInstanceKey;
  }

  // 移除 [
  statement = statement.replace(/\[/igm, "");

  // 使用 ] 分割
  statementComponents = statement.split(JPRightSquareBracket);

  var JPMessage = "";
  for (let index = 0; index < statementComponents.length; index++) {
    var statementComponent = statementComponents[index].trim();

    if (statementComponent.length == 0) {
      continue;
    }

    if (index == 0) {
      let whiteSpaceIdx = statementComponent.indexOf(" ");
      let firstTarget = statementComponent.substring(0, whiteSpaceIdx);
      if (firstTarget != "self" && firstTarget != "super" && JPAllInstance[firstTarget] == null) {
        JPAspectDefineClass.push(firstTarget);
      }
      JPMessage = JPMessage + firstTarget;
      statementComponent = statementComponent.substring(whiteSpaceIdx).trim();
    }

    // 先过滤 frame 参数 CGRect CGPoint CGSzie UIEdgeInsets NSRange
    let structArguments = statementComponent.match(/:\s*[a-zA-Z]*\s*\(.*\)\s*/igm);
    if (structArguments != null) {
      for (let index = 0; index < structArguments.length; index++) {
        let element = structArguments[index];
        let argument = ":" + element.replace(/\s*/igm, "").substring(2, element.length - 1);
        statementComponent = statementComponent.replace(element, argument);
        if (element.index("CGRect") != -1) {
          JPAllInstance[argument] = JPArgumentType("CGRect");
        } else if (element.index("CGSize") != -1) {
          JPAllInstance[argument] = JPArgumentType("CGSize");
        } else if (element.index("CGPoint") != -1) {
          JPAllInstance[argument] = JPArgumentType("CGPoint");
        } else if (element.index("UIEdgeInsets") != -1) {
          JPAllInstance[argument] = JPArgumentType("UIEdgeInsets");
        } else if (element.index("NSRange") != -1) {
          JPAllInstance[argument] = JPArgumentType("NSRange");
        }
      }
    }

    var selArgumentComponents = statementComponent.match(/:\s*([a-zA-Z0-9]+|@"*\(*.*"*\)*)\s*/igm);
    var selArguments = [];
    if (selArgumentComponents != null) {
      for (let index = 0; index < selArgumentComponents.length; index++) {
        var argument = selArgumentComponents[index];
        statementComponent = statementComponent.replace(argument, ":");

        if (argument.indexOf("nil") != -1 || argument.indexOf("NULL") != -1) {
          continue;
        }

        // 移除 :
        argument = argument.substring(1).trim();

        let argumentType = 0;
        let argumentValue = "";
        if (argument.indexOf("@") != -1) {
          // 移除 @
          argument = argument.substring(1).trim();
          if (argument.indexOf("\"") != -1) {
              // NSString
            argumentValue = argument.replace(/\"/igm, "");
          } else {
            // NSNumber
            argumentValue = argument.replace("(", "").replace(")", "");
          }
          argumentType = 1;
        } else if (argument.indexOf("YES") != -1) {
          argumentType = 3;
          argumentValue = "1";
        } else if (argument.indexOf("NO") != -1) {
          argumentType = 3;
          argumentValue = "0";
        } else if (argument == "self") {
          argumentType = 1;
          argumentValue = argument;
        } else {
          argumentValue = argument;
          let JPArgument = JPAllInstance[argumentValue];
          if (JPArgument != null) {
            argumentType = JPArgument["type"];
          }
        }
        selArguments.push({"index": index, "value": argumentValue.trim(), "type": argumentType});
      }
    }
    statementComponent = statementComponent.replace(/\s/igm, "");
    JPMessage = JPMessage + "." + statementComponent;
    
    if (selArguments.length > 0) {
      if (aspectMessage.arguments == null) {
        aspectMessage["arguments"] = {};
      }
      aspectMessage.arguments[JPMessage] = selArguments;
    }
  }
  aspectMessage.message = JPMessage;
  return aspectMessage;
}