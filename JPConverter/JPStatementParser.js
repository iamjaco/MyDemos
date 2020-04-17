//
//
//  JPOCMethodParser.js
//
//  Created by zzyong on 2020/03/20.
//  Copyright © 2020 zzyong. All rights reserved.
//

// 解析点语法语句
function parseAssignStatement(JPAllInstance, statement)
{
  var aspectMessage = JPAspectMessage();

  let equalCharIdx = statement.indexOf("=");
  let varDeclaration = statement.substring(0, equalCharIdx);
  let lastPointIdx = varDeclaration.lastIndexOf(".");
  if (lastPointIdx != -1) {
    let settter = "set" + varDeclaration.substring(lastPointIdx + 1, lastPointIdx + 2).toUpperCase() + varDeclaration.substring(lastPointIdx + 2) + ":";
    aspectMessage["message"] = varDeclaration.substring(0, lastPointIdx + 1) + settter;
    let argumentValue = statement.substring(equalCharIdx + 1);

    let JPInstance = JPAllInstance[argumentValue];
    if (typeof JPInstance == "number") {
      aspectMessage["arguments"] = {
        "index": 0,
        "value": argumentValue,
        "type": JPInstance
      };
    } else if (typeof JPInstance == "object") {
      aspectMessage["arguments"] = {
        "index": 0,
        "value": JPInstance["value"],
        "type": JPInstance["type"]
      };
    } else {
      JPAlert("[ " + statement + " ] ==> " + argumentValue + " 参数类型未定义，请指定该参数类型");
      return null;
    }
    
  } else {

    var localInstanceKey = "";
    let varType = 0;

    let pointerIdx = varDeclaration.indexOf("*");
    if (pointerIdx != -1) {
      localInstanceKey = varDeclaration.substring(pointerIdx + 1);
      varType = 1
      let JPClass = varDeclaration.substring(0, pointerIdx);
      if (JPAspectDefineClass.indexOf(JPClass) == -1) {
        JPAspectDefineClass.push(JPClass);
      }
    } else {

      let lastWhiteSpaceIdx = varDeclaration.lastIndexOf(" ");
      localInstanceKey = varDeclaration.substring(lastWhiteSpaceIdx + 1);
      varType = JPArgumentType(varDeclaration.substring(0, lastWhiteSpaceIdx));
    }

    let varValue = statement.substring(equalCharIdx + 1);

    if (varValue.indexOf("[") != -1) {

      aspectMessage = parseObjectiveCMethod(JPAllInstance, localInstanceKey, varValue);
      JPAllInstance[localInstanceKey] = varType;

    } else if (varValue.indexOf(".") != -1) {

      aspectMessage["message"] = varValue;
      aspectMessage["localInstanceKey"] = localInstanceKey;
      JPAllInstance[localInstanceKey] = varType;

    }  else {
      var argumentValue = null;
      if (varValue.substring(0,1) == "@") {

        if (varValue.indexOf("(") != -1 || varValue.indexOf("\"") != -1) {
          argumentValue = varValue.substring(2, varValue.length - 1);
        } else {
          argumentValue = varValue.substring(1);
        }
      } else {

        if (varValue == "YES") {
          argumentValue = "1";
        } else if (varValue == "NO") {
          argumentValue = "0";
        } else {
          argumentValue = varValue;
        }
      }

      JPAllInstance[localInstanceKey] = {
        "type": varType,
        "value": argumentValue
      };
      // 解析局部变量，无需加入到脚本
      return null;
    }
  }

  return aspectMessage;
}

// 解析 return 语句
function parseReturnStatement(JPAllInstance, returnType, statement)
{
  var aspectMessage = JPAspectMessage();
  aspectMessage.messageType = 1;

  if (statement == JPReturnKey) {
    aspectMessage.message = JPReturnKey;
  } else {
    let returnValue = statement.replace(JPReturnKey, "").trim();
    if (returnValue == "YES") {
      aspectMessage.message = JPReturnKey + "=" + String(returnType) + ":1";
    } else if(returnValue == "NO") {
      aspectMessage.message = JPReturnKey + "="  + String(returnType) + ":0";
    } else {

      let JPInstance = JPAllInstance[returnValue];
      if (typeof JPInstance == "number") {
        aspectMessage.message = JPReturnKey + "=" + String(returnType) + ":" + returnValue;
      } else if (typeof JPInstance == "object") {
        aspectMessage.message = JPReturnKey + "=" + String(returnType) + ":" + JPInstance["value"];
      } else {
        JPAlert("[ " + statement + " ] ==> " + returnValue + " 参数类型未定义，请指定该参数类型");
        return null;
      }
    }
  }

  return aspectMessage;
}

// 解析 OC 方法语句
function parseObjectiveCMethod(JPAllInstance, localInstanceKey, statement)
{
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
    var statementComponent = statementComponents[index];

    if (statementComponent.length == 0) {
      continue;
    }

    if (index == 0) {
      let whiteSpaceIdx = statementComponent.indexOf(" ");
      let firstTarget = statementComponent.substring(0, whiteSpaceIdx);
      if (firstTarget != "self" && firstTarget != "super" && JPAllInstance[firstTarget] == null) {
        if (JPAspectDefineClass.indexOf(firstTarget) == -1) {
          JPAspectDefineClass.push(firstTarget);
        }
      }
      JPMessage = JPMessage + firstTarget;
      statementComponent = statementComponent.substring(whiteSpaceIdx).trim();
    }

    // 多加一个空格防止出现镜像参数替换错误问题。例如：colorWithRed:green:blue:alpha:alpha
    statementComponent = statementComponent + " ";
    var selArgumentComponents = statementComponent.match(/:[a-zA-Z0-9]+\s*/igm);
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
        
        if (argument == "self") {
          argumentType = 1;
          argumentValue = argument;
        } else {

          let JPTempArgumnt = JPAllInstance[argument];
          if (typeof JPTempArgumnt == "object") {

            argumentValue = JPTempArgumnt["value"];
            argumentType = JPTempArgumnt["type"];

          } else if (typeof JPTempArgumnt == "number") {

            argumentValue = argument;
            argumentType = JPTempArgumnt["type"];

          } else {
            JPAlert("[ " + statement + " ] ==> " + argument + " 参数类型未定义，请指定该参数类型");
          }
        }
        selArguments.push({"index": index, "value": argumentValue, "type": argumentType});
      }
    }
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