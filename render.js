const remote = require('electron').remote;
const ipcRenderer = require('electron').ipcRenderer
var ctrWindow = remote.getCurrentWindow()
const drawBadge = require("@ernestchakhoyan/electron-windows-badge")

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

// 添加未读消息badge
async function setMessageBadgeTips(count) {
  if (!count) {
    ipcRenderer.send('draw-windows-badge', {
      task: 0,
      tray: 0
    })
    return
  }
  let badge = drawBadge(count, {
    backgroundColor: "#f00",
    textColor: "#fff"
  })

  function setTrayBadgeForWindows(badge) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.height = 64;
      canvas.width = 64;
      const cxt = canvas.getContext("2d");
      var img = new Image()
      img.src = '../../icon.ico'
      img.onload = function () { //图片加载完成，才可处理
        cxt.drawImage(img, 0, 0, 64, 64);
        cxt.save();
        drawSecond()
      };

      function drawSecond() {
        var img2 = new Image()
        img2.src = badge
        img2.onload = function () {
          cxt.drawImage(img2, 20, 20, 45, 45)
          resolve(canvas.toDataURL())
        }
      }
    })
  }
  let badgeIcon = await setTrayBadgeForWindows(badge)
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
  console.log(88888, yunXin)
})

ipcRenderer.on('reset-session', () => {
  window.location.reload()

  // console.log(2111)
  // yunXin.crtSession = ''
  // yunXin.crtSessionAccount = ''
  // yunXin.crtSessionTeamType = ''
  // yunXin.crtSessionType = ''
})