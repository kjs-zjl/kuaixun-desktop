const {
  remote,
  ipcRenderer,
  shell,
} = require('electron')
var ctrWindow = remote.getCurrentWindow()
const path = require('path')
const dialog = remote.dialog

/**
 * 图片预览相关
 */
$('#chatContent').on('click', '.previewImg', function (index) {
  var eles = $('#chatContent .previewImg')
  var index = eles.index(this)
  funPreviewPic(eles, index)
})
$('#cloudMsgContainer').on('click', '.previewImg', function (index) {
  var eles = $('#cloudMsgContainer .previewImg')
  var index = eles.index(this)
  funPreviewPic(eles, index)
})

function funPreviewPic(eles, index) {
  var array = []
  for (let i = 0; i < eles.length; i++) {
    var ele = eles[i];
    var imgUrl = $(ele).attr('data-src')
    array.push(imgUrl)
  }
  ipcRenderer.send('previewPic', {
    data: array,
    index: index
  })
}
ipcRenderer.on('imgMessage', (event, data) => {
  function previewImg() {
    $('#previewBox .preview-pic').magnify({
      initMaximized: true,
      multiInstances: false,
      headToolbar: [
        'close'
      ],
      footToolbar: [
        'zoomIn',
        'zoomOut',
        'prev',
        'next',
        'actualSize',
        'rotateLeft',
        'rotateRight'
      ],
      progressiveLoading: false,
      callbacks: {
        beforeOpen: function (el) {},
        opened: function (el) {
          setTimeout(() => {
            var str = '第' + (this.groupIndex + 1) + '张图片，共' + this.groupData.length + '张'
            this.$title.text(str)
          }, 0);
          // 第一张
          this.groupIndex === 0 && this.$prev.hide()
          // 最后一张
          this.groupIndex + 1 === this.groupData.length && this.$next.hide()
          $('.magnify-stage').click(function (ev) {
            if (!$(ev.target).is('.magnify-image')) {
              $('.magnify-modal').remove()
              ctrWindow.close()
            }
          })
          // Will fire after modal is opened
        },
        beforeClose: function (el) {
          // Will fire before modal is closed
        },
        closed: function (el) {
          // Will fire after modal is closed
          ctrWindow.close()
        },
        beforeChange: function (index) {
          // console.log(index)
          // Will fire before image is changed
          // The arguments is the current image index of image group
        },
        changed: function (index) {
          var str = '第' + (this.groupIndex + 1) + '张图片，共' + this.groupData.length + '张'
          this.$title.text(str)
          // 第一张
          this.groupIndex === 0 ? this.$prev.hide() : this.$prev.show()
          // 最后一张
          this.groupIndex + 1 === this.groupData.length ? this.$next.hide() : this.$next.show()
          // Will fire after image is changed
          // The arguments is the next image index of image group
        }
      }
    });
  }
  for (let i = 0; i < data.data.length; i++) {
    const url = data.data[i];
    var _html = `<img class="preview-pic" data-caption=" " src=${url} data-src=${url}  />`
    $('.img-box').append(_html)
  }
  previewImg()
  if ($('#previewBox .preview-pic').length > 0) {
    $('#previewBox .preview-pic').eq(data.index).click()
  }
})
// 未读消息添加badge
async function setMessageBadgeTips(count) {
  if (!count) {
    ipcRenderer.send('draw-windows-badge', {
      task: 0,
      tray: 0
    })
    return
  }

  function drawBadge(count, {
    color = 'white',
    background = 'red',
    radius = 10,
    fontSize = '15px',
    fontFamily = 'Arial',
    fontWeight = 'bold',
    max = 99
  }) {
    let countText = count
    let r = 0
    if (count > max) {
      countText = max + '+'
      fontSize = '11px';
      r = 2
    } else if (count > 9) {
      r = 2
    } else if (count > 0) {
      r = 0
    } else {
      return
    }
    const badgeSvg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${radius *
      2}" height="${radius * 2}">
      <circle cx="${radius}" cy="${radius}" r="${radius+r}" fill="${background}" />
      <text x="${radius}" y="${radius+2}" text-anchor="middle" fill="${color}" font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}" dy=".3em">${countText}</text>
    </svg>`;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const DOMURL = self.URL || self.webkitURL;
    const img = new Image();
    const svg = new Blob([badgeSvg], {
      type: 'image/svg+xml;charset=utf-8'
    });
    const url = DOMURL.createObjectURL(svg);
    canvas.width = 16;
    canvas.height = 16;
    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 16, 16);
        const png = canvas.toDataURL();
        DOMURL.revokeObjectURL(png);
        resolve(png);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function drawBadgeCoverIcon(badge) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.height = 16;
      canvas.width = 16;
      const cxt = canvas.getContext("2d");
      var img = new Image()
      // img.src = './images/icon16.ico'
      img.src = path.join(__dirname, '../../icon16.ico')

      img.onload = function () { //图片加载完成，才可处理
        cxt.drawImage(img, 0, 0, 16, 16);
        cxt.save();
        drawSecond()
      };
      let posW
      if (count > 99) {
        posW = 3
      } else {
        posW = 5
      }

      function drawSecond() {
        var img2 = new Image()
        img2.src = badge
        img2.onload = function () {
          cxt.drawImage(img2, posW, 5, 16 - posW, 11)
          resolve(canvas.toDataURL())
        }
      }
    })
  }
  let badge = await drawBadge(count, {})
  let badgeIcon = await drawBadgeCoverIcon(badge)
  ipcRenderer.send('draw-windows-badge', {
    task: badge,
    tray: badgeIcon
  })
}

// 任务栏闪烁
function flashFrame() {
  ipcRenderer.send("flash-frame")
}
ipcRenderer.on('init-windows-badge', () => {
  setMessageBadgeTips(yunXin.totalUnread)
})

//用默认浏览器打开a标签链接
// assuming $ is jQuery
$(document).on('click', 'a[href]', function (event) {
  if (!$(this).hasClass('download-file')) {
    event.preventDefault()
    shell.openExternal($(this).attr('href'))
    return
  }
  // 文件相关
  // 先判断在本地是否存在该文件，是则直接用默认软件打开或打开所在目录并选中，否则下载到本地
  if (!true) {
    // event.preventDefault()
    // 打开文件所在文件夹, 一般情况下还会选中它
    // shell.showItemInFolder($(this).attr('href'))
    // 以默认打开方式打开文件(即直接打开文件)
    // shell.openItem($(this).attr('href'))
  } else {
    $(this).attr('download', true)
  }
})



// 重写window.alert()和window.confirm()方法,解决输入框因alert后不能获取焦点的bug
window.alert = function (title) {
  dialog.showMessageBox(ctrWindow, {
    // type: 'question',
    title: '快讯',
    icon: path.join(__dirname, '../../icon32.ico'),
    message: title
  })
}
window.confirm = function (title, callback) {
  dialog.showMessageBox({
    title: '快讯',
    buttons: ['确定', '取消'],
    icon: path.join(__dirname, '../../icon32.ico'),
    cancelId: 1,
    message: title,
  }, function (btnIndex) {
    if (btnIndex === 0) {
      callback(true)
    } else {
      callback(false)
    }
  })
}

// 应用自动更新相关
ipcRenderer.on('updata-message', (event, {
  message,
  data
}) => {
  const returnData = {
    "error": {
      status: -1,
      msg: '检测更新查询异常'
    },
    "checking-for-update": {
      status: 0,
      msg: '正在检查应用程序更新'
    },
    "update-available": {
      status: 1,
      msg: '检测到新版本，正在下载,请稍后'
    },
    "update-not-available": {
      status: 2,
      msg: '您现在使用的版本为最新版本,无需更新!'
    },
    "isUpdateNow": {
      status: 3,
      msg: '下载完成，现在安装？'
    },
    "download-progress": {
      status: 4,
      msg: '下载进度:'
    }
  };
  console.log(`%c${returnData[message].msg} ${message}`, 'color:green;', data)
  // 更新完成
  if (message === 'isUpdateNow') {
    window.confirm('检测到新版本,是否现在安装', function (result) {
      if (result) {
        ipcRenderer.send('updateNow')
      }
    })
  }
})