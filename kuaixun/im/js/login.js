var Login = {
  init: function () {
    // 判断是否存在token,存在即证明已登录
    var sdktoken = readCookie('sdktoken')
    if (sdktoken) {
      window.location.href = './main.html';
      return;
    }
    this.initNode();
    this.showNotice();
    this.initAnimation();
    this.addEvent();
  },

  initNode: function () {
    // 初始化节点
    this.$account = $('#j-account');
    this.$pwd = $('#j-secret');
    this.$errorMsg = $('#j-errorMsg');
    this.$loginBtn = $('#j-loginBtn');
    this.$footer = $('#footer');
  },

  initAnimation: function () {
    // 添加动画
    var $wrapper = $('#j-wrapper'),
      wrapperClass = $wrapper.attr('class');
    $wrapper
      .addClass('fadeInDown animated')
      .one(
        'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',
        function () {
          $(this)
            .removeClass()
            .addClass(wrapperClass);
        }
      );
  },

  /**
   * 如果浏览器非IE10,Chrome, FireFox, Safari, Opera的话，显示提示
   */
  showNotice: function () {
    var browser = this.getBrowser(),
      temp = browser.split(' '),
      appname = temp[0],
      version = temp[1];
    if (['msie', 'firefox', 'opera', 'safari', 'chrome'].contains(appname)) {
      if (appname == 'msie' && version < 10) {
        this.$footer.find('p').removeClass('hide');
      }
    } else {
      this.$footer.find('p').removeClass('hide');
    }
  },

  addEvent: function () {
    // 绑定事件
    var that = this;
    this.$loginBtn.on('click', this.validate.bind(this));
    $(document).on('keydown', function (e) {
      var ev = e || window.event;
      if (ev.keyCode === 13) {
        that.validate();
      }
    });
  },

  validate: function () {
    // 登录验证
    var that = this,
      account = $.trim(that.$account.val()),
      pwd = that.$pwd.val(),
      errorMsg = '';
    if (account.length === 0) {
      errorMsg = '帐号不能为空';
    } else if (!pwd || pwd.length < 6) {
      errorMsg = '密码长度至少6位';
    } else {
      that.$loginBtn.html('登录中...').attr('disabled', 'disabled');
      that.requestLogin.call(that, account, pwd);
      that.$loginBtn.html('登录').removeAttr('disabled');
    }
    that.$errorMsg.html(errorMsg).removeClass('hide'); // 显示错误信息
    return false;
  },
  //这里做了个伪登录方式（实际上是把accid，token带到下个页面连SDK在做鉴权）
  //一般应用服务器的应用会有自己的登录接口
  requestLogin: function (account, pwd) {
    var that = this;
    // setCookie('uid', account.toLocaleLowerCase());
    //自己的appkey就不用加密了
    // setCookie('sdktoken',pwd);
    // if (
    //   window.CONFIG.appkey === 'fe416640c8e8a72734219e1847ad2547' ||
    //   window.CONFIG.appkey === '45c6af3c98409b18a84451215d0bdd6e'
    // ) {
    //   var password = MD5(pwd);
    // } else {
    //   password = pwd;
    // }
    // setCookie('sdktoken', password);
    // if (/chatroom/.test(location.href)) {
    //   delCookie('nickName');
    //   window.location.href = './list.html';
    // } else {
    //   window.location.href = './main.html';
    // }
    var params = {
      uname: account,
      upwd: MD5(pwd),
    };
    $.ajax({
      // url: CONFIG.url + '/api/createDemoUser',
      url: CONFIG.url + '/api/login',
      type: 'POST',
      data: params,
      contentType: 'application/x-www-form-urlencoded',
      beforeSend: function (req) {
        // req.setRequestHeader('appkey', CONFIG.appkey);
      },
      success: function (data) {
        if (data.res === 200) {
          setCookie('uid', data.msg.accid);
          setCookie('sdktoken', data.msg.token);
          if (/chatroom/.test(location.href)) {
            delCookie('nickName');
            window.location.href = './list.html';
          } else {
            window.location.href = './main.html';
          }
        } else {
          that.$errorMsg.html(data.errmsg).removeClass('hide');
          // that.$submit.html('注册').removeAttr('disabled');
        }
      },
      error: function () {
        that.$errorMsg.html('请求失败，请重试');
      }
    });
  },

  /**
   * 获取浏览器的名称和版本号信息
   */
  getBrowser: function () {
    var browser = {
        msie: false,
        firefox: false,
        opera: false,
        safari: false,
        chrome: false,
        netscape: false,
        appname: 'unknown',
        version: 0
      },
      ua = window.navigator.userAgent.toLowerCase();
    if (/(msie|firefox|opera|chrome|netscape)\D+(\d[\d.]*)/.test(ua)) {
      browser[RegExp.$1] = true;
      browser.appname = RegExp.$1;
      browser.version = RegExp.$2;
    } else if (/version\D+(\d[\d.]*).*safari/.test(ua)) {
      // safari
      browser.safari = true;
      browser.appname = 'safari';
      browser.version = RegExp.$2;
    }
    return browser.appname + ' ' + browser.version;
  }
};
Login.init();