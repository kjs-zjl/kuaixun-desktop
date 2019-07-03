/*
 * @Author: 消息逻辑
 */

'use strict';

YX.fn.message = function () {
  this.$sendBtn = $('#sendBtn');
  this.$messageText = $('#messageText');
  this.$chooseFileBtn = $('#chooseFileBtn');
  this.$fileInput = $('#uploadFile');
  this.$toRecord = $('#toRecord');
  this.$recordTimeBox = $('#toRecordBox')
  this.$recordTimeDuration = $('#toRecordTime')
  this.$cancelRecord = $('#toRecordCancle')
  this.$showNetcallAudioLink = $('#showNetcallAudioLink')
  this.$showNetcallVideoLink = $('#showNetcallVideoLink')
  this.$showWhiteboard = $('#showWhiteboard')
  try {
    this.audioContext = new Recorder.AudioContext;
  } catch (e) {
    console.log(e);
  }
  YX.fn.recorder = null;
  YX.fn.recordTimeout = '';
  YX.fn.recordTime = 0;
  this.$sendBtn.on('click', this.sendTextMessage.bind(this));
  this.$messageText.on('keydown', this.inputMessage.bind(this));
  this.$messageText.on('paste', this.PastePictrue.bind(this));
  this.$chooseFileBtn.on('click', 'a', this.chooseFile.bind(this));
  this.$fileInput.on('change', this.uploadFile.bind(this));
  this.$toRecord.on('click', this.recordAudio.bind(this));
  this.$cancelRecord.on('click', this.cancelRecordAudio.bind(this));
  this.$showNetcallAudioLink.on('click', this.stopRecordAndAudio.bind(this));
  this.$showNetcallVideoLink.on('click', this.stopRecordAndAudio.bind(this));
  this.$showWhiteboard.on('click', this.stopRecordAndAudio.bind(this));
  //消息重发
  this.$chatContent.delegate('.j-resend', 'click', this.doResend.bind(this));
  //语音播发
  this.$chatContent.delegate('.j-mbox', 'click', this.playAudio);
  //聊天面板右键菜单
  $.contextMenu({
    selector: '.j-msg',
    callback: function (key, options) {
      // 撤回信息
      if (key === 'delete') {
        var id = options.$trigger.parent().data('id');
        var msg = this.cache.findMsg(this.crtSession, id);
        if (!msg || options.$trigger.hasClass('j-msg')) {}
        if (msg.flow !== 'out' && msg.scene === 'p2p') {
          alert('点对点场景，只能撤回自己发的消息');
          return;
        }
        if (
          !this.cache.isCurSessionTeamManager &&
          msg.flow !== 'out' &&
          msg.scene === 'team'
        ) {
          alert('群会话场景，非管理员不能撤回别人发的消息');
          return;
        }
        options.$trigger.removeClass('j-msg');
        this.nim.deleteMsg({
          msg: msg,
          done: function (err) {
            options.$trigger.addClass('j-msg');
            if (err) {
              if (err.code === 508) {
                alert('发送时间超过2分钟的消息，不能被撤回');
              } else {
                alert(err.message || '操作失败');
              }
            } else {
              msg.opeAccount = userUID;
              this.backoutMsg(id, {
                msg: msg
              });
            }
          }.bind(this)
        });
        // 复制信息 
      } else if (key === 'copy') {
        // 复制信息到粘贴板
        function copyMessage(msg) {
          var oInput = document.createElement('input');
          oInput.value = msg
          document.body.appendChild(oInput);
          oInput.select(); // 选择对象
          document.execCommand("Copy"); // 执行浏览器复制命令
          oInput.className = 'oInput';
          oInput.style.display = 'none';
          // alert('成功复制到粘贴板');
        }
        var id = options.$trigger.parent().data('id')
        var msg = this.cache.findMsg(this.crtSession, id);
        if (msg.type !== "text" && msg.type !== 'image') {
          alert('该类型消息不支持复制');
          return
        }
        if (msg.type === 'text') {
          copyMessage(msg.text)
        }
        if (msg.type === 'image') {
          msg.file.type = 'image'
          copyMessage(JSON.stringify(msg.file))
        }
      }
    }.bind(this),
    items: {
      delete: {
        name: '撤回',
        icon: 'delete'
      },
      copy: {
        name: '复制',
        icon: 'copy'
      }
    }
  });

  //表情贴图模块
  this.initEmoji();

};

/**
 * 处理收到的消息
 * @param  {Object} msg
 * @return
 */
YX.fn.doMsg = function (msg) {
  console.log(11, msg)
  var that = this,
    who = msg.to === userUID ? msg.from : msg.to,
    updateContentUI = function () {
      //如果当前消息对象的会话面板打开
      if (that.crtSessionAccount === who) {
        that.sendMsgRead(who, msg.scene);
        that.cache.dealTeamMsgReceipts(msg, function () {
          var msgHtml = appUI.updateChatContentUI(msg, that.cache);
          that.$chatContent.find('.no-msg').remove();
          that.$chatContent.append(msgHtml).scrollTop(99999);
        })
      }
    };
  //非群通知消息处理
  if (/text|image|file|audio|video|geo|custom|tip|robot/i.test(msg.type)) {
    this.cache.addMsgs(msg);
    var account = msg.scene === 'p2p' ? who : msg.from;
    //用户信息本地没有缓存，需存储
    if (!this.cache.getUserById(account)) {
      this.mysdk.getUser(account, function (err, data) {
        if (!err) {
          that.cache.updatePersonlist(data);
          updateContentUI();
        }
      });
    } else {
      this.buildSessions();
      updateContentUI();
    }
  } else {
    // 群消息处理
    this.messageHandler(msg, updateContentUI);
  }
};
/*****************************************************************
 * emoji模块
 ****************************************************************/
YX.fn.initEmoji = function () {
  this.$showEmoji = $('#showEmoji');
  this.$showEmoji.on('click', this.showEmoji.bind(this));
  var that = this,
    emojiConfig = {
      emojiList: emojiList, //普通表情
      pinupList: pinupList, //贴图
      width: 500,
      height: 300,
      imgpath: './images/',
      callback: function (result) {
        that.cbShowEmoji(result);
      }
    };
  this.$emNode = new CEmojiEngine($('#emojiTag')[0], emojiConfig);
  this.$emNode._$hide();
};
/**
 * 选择表情回调
 * @param  {objcet} result 点击表情/贴图返回的数据
 */
YX.fn.cbShowEmoji = function (result) {
  if (!!result) {
    var scene = this.crtSessionType,
      to = this.crtSessionAccount;
    // 贴图，发送自定义消息体
    if (result.type === 'pinup') {
      var index = Number(result.emoji) + 1;
      var content = {
        type: 3,
        data: {
          catalog: result.category,
          chartlet: result.category + '0' + (index >= 10 ? index : '0' + index)
        }
      };
      this.mysdk.sendCustomMessage(
        scene,
        to,
        content,
        this.sendMsgDone.bind(this)
      );
    } else {
      // 表情，内容直接加到输入框
      // this.$messageText[0].value = this.$messageText[0].value + result.emoji;
      this.$messageText.html(this.$messageText.html() + result.emoji)
    }
  }
};

YX.fn.showEmoji = function () {
  this.$emNode._$show();
};
/*************************************************************************
 * 粘贴图片逻辑
 *
 ************************************************************************/
YX.fn.PastePictrue = function () {
  var that = this,
    scene = this.crtSessionType,
    to = this.crtSessionAccount,
    cbd = event.clipboardData,
    ua = window.navigator.userAgent;
  // var originVal = that.$messageText.val()
  var originVal = that.$messageText.html()
  // 如果是 Safari 直接 return
  if (!(event.clipboardData && event.clipboardData.items)) {
    return;
  }
  // Mac平台下Chrome49版本以下 复制Finder中的文件的Bug Hack掉
  if (cbd.items && cbd.items.length === 2 && cbd.items[0].kind === "string" && cbd.items[1].kind === "file" &&
    cbd.types && cbd.types.length === 2 && cbd.types[0] === "text/plain" && cbd.types[1] === "Files" &&
    ua.match(/Macintosh/i) && Number(ua.match(/Chrome\/(\d{2})/i)[1]) < 49) {
    return;
  }
  for (var i = 0; i < cbd.items.length; i++) {
    var item = cbd.items[i];
    if (item.kind === "file") {
      var blob = item.getAsFile();
      if (blob.size === 0) {
        return;
      }
      // var reader = new FileReader();
      // var imgs = new Image();
      // imgs.file = blob;
      // reader.onload = (function (aImg) {
      //   return function (e) {
      //     aImg.src = e.target.result;
      //     console.log(111111, e.target.result)
      //   };
      // })(imgs);
      // reader.readAsDataURL(blob);
      // console.log(blob)
      that.mysdk.sendPastePictrue(scene, to, blob, that.sendMsgDone.bind(that));
    } else if (item.kind === "string") {
      item.getAsString(function (str) {
        try {
          var obj = JSON.parse(str);
          if (typeof obj == 'object' && obj) {
            if (obj.type === 'image') {
              // that.$messageText.val('' + originVal)
              that.$messageText.html('' + originVal)
              /**  
               * 将以base64的图片url数据转换为Blob  
               * @param urlData  
               * 用url方式表示的base64图片数据  
               */
              function convertBase64UrlToBlob(base64) {
                var urlData = base64.dataURL;
                var type = base64.type;
                var bytes = window.atob(urlData.split(',')[1]); //去掉url的头，并转换为byte
                //处理异常,将ascii码小于0的转换为大于0  
                var ab = new ArrayBuffer(bytes.length);
                var ia = new Uint8Array(ab);
                for (var i = 0; i < bytes.length; i++) {
                  ia[i] = bytes.charCodeAt(i);
                }
                return new Blob([ab], {
                  type: type
                });
              }
              /* 
               * 图片的绝对路径地址 转换成base64编码 如下代码： 
               */
              function getBase64Image(img) {
                var canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                var ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, img.width, img.height);
                var ext = img.src.substring(img.src.lastIndexOf(".") + 1).toLowerCase();
                var dataURL = canvas.toDataURL("image/" + ext);
                return {
                  dataURL: dataURL,
                  type: "image/" + ext
                };
              }
              var img = obj.url
              var image = new Image();
              image.crossOrigin = '';
              image.src = img;
              image.onload = function () {
                var base64 = getBase64Image(image);
                // msg.file.base64 = base64
                var blob = convertBase64UrlToBlob(base64)
                that.mysdk.sendPastePictrue(scene, to, blob, that.sendMsgDone.bind(that));
              }

            }
            return true;
          } else {
            return false;
          }
        } catch (e) {
          return false;
        }
      })
    }
  }
};
/*************************************************************************
 * 发送消息逻辑
 *
 ************************************************************************/
YX.fn.uploadFile = function () {
  var that = this,
    scene = this.crtSessionType,
    to = this.crtSessionAccount,
    fileInput = this.$fileInput.get(0);
  if (fileInput.files[0].size == 0) {
    alert('不能传空文件');
    return;
  }
  this.mysdk.sendFileMessage(scene, to, fileInput, this.sendMsgDone.bind(this));
};

YX.fn.chooseFile = function () {
  this.$fileInput.click();
};

YX.fn.sendTextMessage = function () {
  var self = this
  if (self.$toRecord.hasClass('recording') || self.$toRecord.hasClass('recorded')) {
    if (YX.fn.recordTime < 2) {
      alert('语音消息最短2s')
      return
    }
    self.stopRecordAudio()
    self.sendRecordAudio()
    return
  }
  var scene = this.crtSessionType,
    to = this.crtSessionAccount,
    // text = this.$messageText.val().trim();
    text = this.$messageText.text().trim();
  if (!!to && !!text) {
    if (text.length > 500) {
      alert('消息长度最大为500字符');
    } else if (text.length === 0) {
      return;
    } else {
      var ats = this.$messageText.find('.atwho-inserted-item'),
        options = {
          scene: scene || 'p2p',
          to: to,
          text: text,
          done: this.sendMsgDone.bind(this)
        }
      if (scene !== 'p2p' && ats.length !== 0) {
        var apns = {
          accounts: [],
          content: text,
          // forcePush: true
        }
        for (let i = 0; i < ats.length; i++) {
          var at = ats[i];
          apns.accounts.push($(at).attr('data-atwho-account'))
        }
        $.unique(apns.accounts)
        options.apns = apns
      }
      // 客户端反垃圾检查
      var ret = nim.filterClientAntispam({
        content: text
      });

      switch (ret.type) {
        case 0:
          // console.log('没有命中反垃圾词库', ret.result);
          break;
        case 1:
          // console.log('已对特殊字符做了过滤', ret.result);
          options.text = ret.result;
          break;
        case 2:
          // console.log('建议拒绝发送', ret.result);
          this.mysdk.sendTipMsg({
            scene: scene,
            to: to,
            tip: '命中敏感词，拒绝发送'
          });
          return;
        case 3:
          // console.log('建议服务器处理反垃圾，发消息带上字段clientAntiSpam';
          options.clientAntiSpam = true;
          break;
      }
      // 查询是否需要群回执
      // if (
      //   this.crtSessionType === 'team' &&
      //   this.crtSessionTeamType === 'advanced'
      // ) {
      //   if ($('#needTeamMsgReceipt') && $('#needTeamMsgReceipt')[0].checked) {
      //     options.needMsgReceipt = true;
      //   }
      // }
      this.nim.sendText(options);
    }
  }
};

YX.fn.sendRecordAudio = function () {
  var self = this
  YX.fn.recorder.exportWAV(function (blob) {
    self.$toRecord.addClass('uploading');
    self.nim.sendFile({
      scene: self.crtSessionType,
      to: self.crtSessionAccount,
      type: 'audio',
      blob: blob,
      uploadprogress: function (obj) {
        console.log('文件总大小: ' + obj.total + 'bytes');
        console.log('已经上传的大小: ' + obj.loaded + 'bytes');
        console.log('上传进度: ' + obj.percentage);
        console.log('上传进度文本: ' + obj.percentageText);
        if (obj.percentage === 100) {
          self.$toRecord.removeClass('uploading');
          self.$toRecord.removeClass('recorded');
        }
      },
      done: self.sendMsgDone.bind(self)
    });
  });
  self.cancelRecordAudio()
}

YX.fn.stopRecordAndAudio = function () {
  YX.fn.stopRecordAudio()
  YX.fn.stopPlayAudio()
}
YX.fn.recordAudio = function () {
  YX.fn.stopPlayAudio()
  var self = this
  if (location.protocol === 'http:') {
    alert('请使用https协议');
    return
  }
  if (!self.audioContext) {
    alert('当前浏览器不支持录音!');
    return
  }
  if (!self.$toRecord.hasClass('recording') && !self.$toRecord.hasClass('recorded')) {
    if (YX.fn.recorder) {
      YX.fn.recorder.clear();
      YX.fn.recorder.record();
      self.showRecorderTime()
    } else {
      Recorder.mediaDevices.getUserMedia({
        audio: true
      }).then(function (stream) {
        var input = self.audioContext.createMediaStreamSource(stream);
        YX.fn.recorder = new Recorder(input);
        YX.fn.recorder.record();
        if (~self.audioContext.state.indexOf('suspend')) {
          self.audioContext.resume().then(function () {
            YX.fn.recorder.record();
            self.showRecorderTime()
            console.log('audioContext suspend state resume');
          })
        } else {
          self.showRecorderTime()
        }
      }).catch(function (err) {
        alert('您没有可用的麦克风输入设备')
        self.$toRecord.addClass('disabled')
        console.log('No live audio input: ' + err, err.name + ": " + err.message);
      });
    }
  }
}
YX.fn.showRecorderTime = function () {
  var self = this
  if (YX.fn.recorder) {
    self.$recordTimeBox.show()
    self.$toRecord.addClass('recording');
    YX.fn.recordTime = 0;
    YX.fn.recordTimeout = setTimeout(self.recordTimeRun.bind(self), 1000)
  }
}
YX.fn.recordTimeRun = function () {
  var self = this
  YX.fn.recordTimeout = setTimeout(self.recordTimeRun.bind(self), 1000)
  YX.fn.recordTime++;
  if (YX.fn.recordTime >= 60) {
    clearTimeout(YX.fn.recordTimeout)
    self.stopRecordAudio()
  }
  self.$recordTimeDuration.html('00:' + (YX.fn.recordTime > 9 ? YX.fn.recordTime : '0' + YX.fn.recordTime))
}
YX.fn.stopRecordAudio = function () {
  var $toRecord = $('#toRecord')
  var isRecording = $toRecord.hasClass('recording');
  if (isRecording) {
    $toRecord.removeClass('recording');
    $toRecord.addClass('recorded');
    if (YX.fn.recorder) {
      clearTimeout(YX.fn.recordTimeout)
      YX.fn.recorder.stop();
    }
  }
}

YX.fn.cancelRecordAudio = function () {
  var $toRecord = $('#toRecord')
  var isRecording = $toRecord.hasClass('recording') || $toRecord.hasClass('recorded');
  var $recordTimeBox = $('#toRecordBox')
  var $recordTimeDuration = $('#toRecordTime')
  if (isRecording && YX.fn.recorder) {
    clearTimeout(YX.fn.recordTimeout)
    YX.fn.recorder.stop();
    YX.fn.recorder.clear();
    $recordTimeBox.hide()
    $toRecord.removeClass('recording');
    $toRecord.removeClass('recorded');
    $recordTimeDuration.html('00:00')
    YX.fn.recordTime = 0
  }
}
/**
 * 发送消息完毕后的回调
 * @param error：消息发送失败的原因
 * @param msg：消息主体，类型分为文本、文件、图片、地理位置、语音、视频、自定义消息，通知等
 */
YX.fn.sendMsgDone = function (error, msg) {
  if (error && error.code === 7101) {
    alert('被拉黑');
    msg.blacked = true;
  }
  this.cache.addMsgs(msg);
  if (msg.type === 'text') {
    // this.$messageText.val('');
    this.$messageText.html('');
  }
  this.$chatContent.find('.no-msg').remove();
  this.cache.dealTeamMsgReceipts(msg, function () {
    var msgHtml = appUI.updateChatContentUI(msg, this.cache);
    this.$chatContent.append(msgHtml).scrollTop(99999);
    $('#uploadForm')
      .get(0)
      .reset();
  }.bind(this))
};

/**
 * @某人
 */
YX.fn.listenAtTeamMember = function () {
  var that = this
  var teamId = that.crtSessionAccount
  var atwhoMembers = []
  var members;
  var shouTeamMember = function () {
    members = that.cache.getTeamMembers(teamId).members
    var array = []
    if (members.length > 1) {
      atwhoMembers.push({
        nick: '所有人',
        account: '所有人'
      })
    }
    for (let i = 0; i < members.length; i++) {
      if (!that.cache.getUserById(members[i].account)) {
        array.push(members[i].account)
      }
    }
    if (array.length > 0) {
      getTeamMemberInfo(array)
    } else {
      showAtTeamMemberPanel()
    }
  }
  var showAtTeamMemberPanel = function () {
    that.sortTeamMembers(members)
    for (var i = 0, l = members.length; i < l; ++i) {
      var member = members[i],
        account = member.account;
      member.nick = getNick(account)
      if (account !== that.accid) {
        atwhoMembers.push(member)
      }
    }
    that.$messageText.atwho({
      at: "@",
      // displayTpl: "<li data-atwho-nick='${nick}' data-atwho-account='${account}'>${nick}</li>",
      displayTpl: "<li data-listen-at>${nick}</li>",
      // insertTpl: '${atwho-at}${nick}',
      insertTpl: "<span class='atwho-inserted-item' data-atwho-account='${account}'>${atwho-at}${nick}</span>",
      data: atwhoMembers,
      limit: 40,
      // callbacks: {
      //   beforeSave: function (data) {
      //     console.log('beforeSave', data)
      //     return data
      //   },
      //   beforeInsert: function (value, $li) {
      //     // console.log('beforeInsert', value, $li, $li.attr('data-atwho-nick'), $li.attr('data-atwho-account'))
      //     // var accid = $li.attr('data-atwho-account')
      //     // var html = '',
      //     //   // html += '<span data-atwho-account="${nick}"></span>'
      //     //   return value === '@All' ? '@所有人' : value
      //   }
      // }
    })
  }
  var getTeamMemberInfo = function (array) {
    that.mysdk.getUsers(array, function (err, data) {
      if (!err) {
        for (var j = 0; j < data.length; j++) {
          that.cache.updatePersonlist(data[j])
        }
        showAtTeamMemberPanel()
      } else {
        alert("获取用户信息失败")
      }
    })
  }
  that.getTeamMembers(teamId, shouTeamMember)
}

YX.fn.inputMessage = function (e) {
  var ev = e || window.event;
  var woohecc = {
    placeCaretAtEnd: function (el) {
      el.focus();
      if (typeof window.getSelection != "undefined" &&
        typeof document.createRange != "undefined") {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else if (typeof document.body.createTextRange != "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(false);
        textRange.select();
      }
    },
  }
  if ($.trim(this.$messageText.text()).length > 0) {
    if (ev.keyCode === 13 && ev.ctrlKey) {
      this.$messageText.html(this.$messageText.html() + '</br>\r\n');
      woohecc.placeCaretAtEnd(this.$messageText.get(0));
      return false;
    } else if (ev.keyCode === 13 && !ev.ctrlKey) {
      if ($('.atwho-view')[0].style.display !== 'block') {
        this.sendTextMessage();
      }
    }
  }
};
// 重发
YX.fn.doResend = function (evt) {
  var $node;
  if (evt.target.tagName.toLowerCase() === 'span') {
    $node = $(evt.target);
  } else {
    $node = $(evt.target.parentNode);
  }
  var sessionId = $node.data('session');
  var idClient = $node.data('id');
  var msg = this.cache.findMsg(sessionId, idClient);
  this.mysdk.resendMsg(
    msg,
    function (err, data) {
      if (err) {
        alert(err.message || '发送失败');
      } else {
        this.cache.setMsg(sessionId, idClient, data);
        var msgHtml = appUI.buildChatContentUI(sessionId, this.cache);
        this.$chatContent.html(msgHtml).scrollTop(99999);
        $('#uploadForm')
          .get(0)
          .reset();
      }
    }.bind(this)
  );
};
/************************************************************
 * 获取当前会话消息
 * @return {void}
 *************************************************************/
YX.fn.getHistoryMsgs = function (scene, account) {
  var id = scene + '-' + account;
  var sessions = this.cache.findSession(id);
  var msgs = this.cache.getMsgs(id);
  //标记已读回执
  this.sendMsgRead(account, scene);
  if (!!sessions) {
    // if (sessions.unread >= msgs.length) {
    // var end = msgs.length > 0 ? msgs[0].time : false;
    // }
    // if (sessions.lastMsg) {
    //   var end = sessions.lastMsg.time || false
    // }
    var end = false
    this.mysdk.getLocalMsgs(id, end, this.getLocalMsgsDone.bind(this));
    return;
    // }
  }
  this.doChatUI(id);
};
//拿到历史消息后聊天面板UI呈现
YX.fn.doChatUI = function (id) {
  this.cache.dealTeamMsgReceipts(id, function () {
    var temp = appUI.buildChatContentUI(id, this.cache);
    this.$chatContent.html(temp);
    this.$chatContent.scrollTop(9999);
    //已读回执UI处理
    this.markMsgRead(id);
  }.bind(this));
};

YX.fn.getLocalMsgsDone = function (err, data) {
  if (!err) {
    var reset = true
    this.cache.addMsgsByReverse(data.msgs, true);
    var id = data.sessionId;
    var array = getAllAccount(data.msgs);
    var that = this;
    this.checkUserInfo(array, function () {
      that.doChatUI(id);
    });
  } else {
    alert('获取历史消息失败');
  }
};

//检查用户信息有木有本地缓存 没的话就去拿拿好后在执行回调
YX.fn.checkUserInfo = function (array, callback) {
  var arr = [];
  var that = this;
  for (var i = array.length - 1; i >= 0; i--) {
    if (!this.cache.getUserById(array[i])) {
      arr.push(array[i]);
    }
  }
  if (arr.length > 0) {
    this.mysdk.getUsers(arr, function (error, data) {
      if (!error) {
        that.cache.setPersonlist(data);
        callback();
      } else {
        alert('获取用户信息失败');
      }
    });
  } else {
    callback();
  }
};
//发送已读回执
YX.fn.sendMsgRead = function (account, scene) {
  if (scene === 'p2p') {
    var id = scene + '-' + account;
    var sessions = this.cache.findSession(id);
    this.mysdk.sendMsgReceipt(sessions.lastMsg, function (err, data) {
      if (err) {
        console.log(err);
      }
    });
  }
};
//UI上标记消息已读
YX.fn.markMsgRead = function (id) {
  if (!id || this.crtSession !== id) {
    return;
  }
  var msgs = this.cache.getMsgs(id);
  for (var i = msgs.length - 1; i >= 0; i--) {
    var message = msgs[i];
    // 目前不支持群已读回执
    if (message.scene === 'team') {
      return;
    }
    if (message.type !== 'tip' && window.nim.isMsgRemoteRead(message)) {
      $('.item.item-me.read').removeClass('read');
      $('#' + message.idClient).addClass('read');
      break;
    }
  }
};
//撤回消息
YX.fn.backoutMsg = function (id, data) {
  var msg = data ? data.msg : this.cache.findMsg(this.crtSession, id);
  var to = msg.target;
  var session = msg.sessionId;
  var opeAccount = msg.opeAccount || msg.from;
  var opeNick = getNick(opeAccount);
  if (msg.scene === 'team') {
    var teamId = msg.to || this.crtSessionAccount;
    var teamInfo = this.cache.getTeamById(teamId);
    if (teamInfo && opeAccount !== msg.from) {
      if (teamInfo.owner === opeAccount) {
        opeNick = '群主' + opeNick;
      } else if (teamInfo.type === 'advanced') {
        opeNick = '管理员' + opeNick;
      }
    }
  }

  this.nim.sendTipMsg({
    isLocal: true,
    idClient: msg.idClient || null,
    scene: msg.scene,
    to: to,
    tip: (userUID === opeAccount ? '你' : opeNick) + '撤回了一条消息',
    time: msg.time,
    done: function (err, data) {
      if (!err) {
        this.cache.backoutMsg(session, id, data);
        if (this.crtSession === session) {
          var msgHtml = appUI.buildChatContentUI(this.crtSession, this.cache);
          this.$chatContent.html(msgHtml).scrollTop(99999);
          //已读回执UI处理
          this.markMsgRead(this.crtSession);
        }
      } else {
        alert('操作失败');
      }
    }.bind(this)
  });
};

/*********************************多人音视频模块********************************* */
/** 发送群视频tip消息
 * @param {object} option
 * @param {string} option.teamId 群id
 * @param {string} option.account 发送群视频的uid
 * @param {string} option.message tip消息
 */
YX.fn.sendTeamNetCallTip = function (option) {
  var tmpUser = this.cache.getTeamMemberInfo(option.account, option.teamId);
  option.nick = tmpUser.nickInTeam || getNick(option.account);

  option.isLocal = option.isLocal === undefined ? true : option.isLocal;
  /** 远程 先禁掉 */
  this.nim.sendTipMsg({
    isLocal: option.isLocal,
    scene: 'team',
    to: option.teamId,
    tip: getNick(option.nick) + option.message,
    time: Date.now(),
    isPushable: false,
    isHistoryable: false,
    isRoamingable: false,
    done: function (err, data) {
      // err && console.log(err)
      // this.buildSessions();
      // var msgHtml = appUI.buildChatContentUI(this.crtSession, this.cache)
      this.cache.addMsgs(data);
      var msgHtml = appUI.updateChatContentUI(data, this.cache);
      this.$chatContent.append(msgHtml).scrollTop(99999);
    }.bind(this)
  });
};

/** 对列表用户进行点对点发送自定义系统通知
 * @param {Array} list
 * @param {object} option
 * @param {string} option.caller 主叫人
 * @param {string} option.type 视频还是音频, 如果为空，则取消呼叫!
 * @param {string} option.list 被呼叫uid的列表
 * @param {string} option.teamId 群id
 * @param {string} option.channelName 房间id
 */
YX.fn.sendCustomMessage = function (option) {
  var that = this;
  option.list = option.list || [];

  var tmpUser = this.cache.getTeamMemberInfo(option.caller, option.teamId);
  option.nick = tmpUser.nickInTeam || getNick(option.caller);

  option.list.forEach(function (uid) {
    // this.mysdk.sendCustomMessage('p2p', item, content, this.sendMsgDone.bind(this))
    that.nim.sendCustomSysMsg({
      scene: 'p2p',
      to: uid,
      enablePushNick: false,
      content: JSON.stringify({
        id: 3,
        members: option.list,
        teamId: option.teamId,
        room: option.channelName,
        type: option.type
      }),
      isPushable: true,
      sendToOnlineUsersOnly: false,
      apnsText: option.nick + '正在呼叫您',
      done: function (error, msg) {
        console.log(msg);
      }
    });
  });
};