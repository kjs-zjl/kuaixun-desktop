const remote = require('electron').remote;
const ipcRenderer = require('electron').ipcRenderer
var ctrWindow = remote.getCurrentWindow()
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