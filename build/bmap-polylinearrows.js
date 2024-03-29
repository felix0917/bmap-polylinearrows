(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('core-js/modules/es6.array.map.js'), require('core-js/modules/es6.function.bind.js'), require('core-js/modules/es6.number.constructor.js'), require('core-js/modules/es6.array.for-each.js'), require('core-js/modules/es6.object.freeze.js')) :
  typeof define === 'function' && define.amd ? define(['core-js/modules/es6.array.map.js', 'core-js/modules/es6.function.bind.js', 'core-js/modules/es6.number.constructor.js', 'core-js/modules/es6.array.for-each.js', 'core-js/modules/es6.object.freeze.js'], factory) :
  (global = global || self, global.PolylineArrows = factory());
}(this, (function () { 'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    Object.defineProperty(Constructor, "prototype", {
      writable: false
    });
    return Constructor;
  }

  /**
   * Returns the first parameter if not undefined, otherwise the second parameter.
   * Useful for setting a default value for a parameter.
   *
   * @function
   *
   * @param {*} a
   * @param {*} b
   * @returns {*} Returns the first parameter if not undefined, otherwise the second parameter.
   *
   * @example
   * param = Cesium.defaultValue(param, 'default');
   */
  function defaultValue(a, b) {
    if (a !== undefined && a !== null) {
      return a;
    }

    return b;
  }
  /**
   * A frozen empty object that can be used as the default value for options passed as
   * an object literal.
   * @type {Object}
   * @memberof defaultValue
   */


  defaultValue.EMPTY_OBJECT = Object.freeze({});

  var PolylineArrows = /*#__PURE__*/function () {
    function PolylineArrows(mapType, map, data, icon) {
      var opts = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

      _classCallCheck(this, PolylineArrows);

      this.mapType = mapType; // 地图类型，支持['BMap','BMapGL']

      this.map = map; // 地图实例化对象

      this.data = data; // geojson格式的polyline数据

      this.icon = icon; // 箭头图标

      this.step = defaultValue(opts.step, 90); // 箭头间距

      this.iconSize = defaultValue(opts.iconSize, {
        x: 12,
        y: 12
      }); // 箭头大小，单位px

      this.correctAngle = defaultValue(opts.correctAngle, 0); // 图标角度校正：图标的起始角度应该对准水平轴朝右（---->），单位：角度制
      // 私有变量

      this.linePoints = []; // 扁平化线路坐标数组

      this.arrowOverlays = []; // 箭头覆盖物容器

      this.refreshHandlerFunc = null; // 箭头更新处理函数

      this.parseLineData();
      this.initRefreshEvent();
      this.dispatchArrows(); // 初始化加载
    }
    /**
     * 解析线路数据
     */


    _createClass(PolylineArrows, [{
      key: "parseLineData",
      value: function parseLineData() {
        var geo = this.data.geometry;
        if (!geo) return;
        var type = geo.type;

        switch (type) {
          case 'LineString':
            this.linePoints = geo.coordinates;
            break;

          case 'MultiLineString':
            this.linePoints = geo.coordinates.flat();
            break;

          default:
            console.error('error polyline data!');
            break;
        }
      }
      /**
       * 初始化箭头更新事件
       * 地图平移和缩放结束时触发
       */

    }, {
      key: "initRefreshEvent",
      value: function initRefreshEvent() {
        this.refreshHandlerFunc = this.refreshHandler.bind(this);

        if (this.linePoints && this.linePoints.length > 1) {
          this.map.addEventListener('moveend', this.refreshHandlerFunc);
          this.map.addEventListener('zoomend', this.refreshHandlerFunc);
        }
      }
      /**
       * 地图平移缩放结束事件处理
       */

    }, {
      key: "refreshHandler",
      value: function refreshHandler() {
        this.dispatchArrows();
      }
      /**
      * 箭头绘制调度中心
      */

    }, {
      key: "dispatchArrows",
      value: function dispatchArrows() {
        var that = this; // 每次更新前先清空所有箭头数据

        that.clearArrows();
        var step = that.step;
        var sylength = 0;
        var currrentLength = 0;
        var currentStart = that.pointToPixel(that.linePoints[0][0], that.linePoints[0][1]);
        var arrowNode = {};

        for (var i = 0; i < that.linePoints.length - 1; i++) {
          var currentLinePoint = that.linePoints[i];
          var nextLinePoint = that.linePoints[i + 1];
          var start = that.pointToPixel(currentLinePoint[0], currentLinePoint[1]);
          var end = that.pointToPixel(nextLinePoint[0], nextLinePoint[1]);
          var dx = end.x - start.x,
              dy = start.y - end.y;

          if (dx === 0 && dy === 0) {
            // 意味着折线中节点太近，忽略这段距离
            continue;
          }

          var rotation = Math.atan2(dy, dx); // 两点旋转角度差

          var nodeDistance = void 0; //  两点像素距离

          if (rotation === 0) {
            nodeDistance = dx;
          } else {
            nodeDistance = dy / Math.sin(rotation);
          }

          if (Number(nodeDistance) < Number(step - currrentLength)) {
            // 间距过短
            currrentLength += nodeDistance;
            currentStart = end;
          } else {
            if (currrentLength == 0) {
              sylength = nodeDistance % step;
              var splitNum = Math.floor(nodeDistance / step);
              var Y = -Math.sin(rotation) * step;
              var X = Math.cos(rotation) * step;

              for (var _i = 0; _i < splitNum; _i++) {
                arrowNode.x = currentStart.x + X;
                arrowNode.y = currentStart.y + Y;
                currentStart = arrowNode;
                that.addArrow(arrowNode, rotation);
              }

              currrentLength = sylength;
              currentStart = end;
            } else {
              var littleStep = step - currrentLength;

              var _Y = -Math.sin(rotation) * littleStep;

              var _X = Math.cos(rotation) * littleStep;

              arrowNode.x = currentStart.x + _X;
              arrowNode.y = currentStart.y + _Y;
              currentStart = arrowNode;
              that.addArrow(arrowNode, rotation);
              sylength = (nodeDistance - littleStep) % step;

              var _splitNum = Math.floor((nodeDistance - littleStep) / step);

              _Y = -Math.sin(rotation) * step;
              _X = Math.cos(rotation) * step;

              for (var _i2 = 0; _i2 < _splitNum; _i2++) {
                arrowNode.x = currentStart.x + _X;
                arrowNode.y = currentStart.y + _Y;
                currentStart = arrowNode;
                that.addArrow(arrowNode, rotation);
              }

              currrentLength = sylength;
              currentStart = end;
            }
          }
        }
      }
      /**
       * 新增箭头
       * @param arrowNode 箭头对象
       * @param rotation 旋转角度
       */

    }, {
      key: "addArrow",
      value: function addArrow(arrowNode, rotation) {
        var seeExtent = this.map.getBounds();
        var arrowPoint = this.pixelToPoint(arrowNode.x, arrowNode.y); // 仅在屏幕可视区域内加载

        if (seeExtent.containsPoint(arrowPoint)) {
          var currrentAngle = rotation / Math.PI * 180 - this.correctAngle;
          this.drawArrow(arrowPoint, -currrentAngle);
        }
      }
      /**
       * 使用百度地图API绘制箭头
       * @param arrowPoint 箭头像素坐标
       * @param rotation 旋转角度
       */

    }, {
      key: "drawArrow",
      value: function drawArrow(arrowPoint, rotation) {
        var marker = this.createMarker(arrowPoint);
        marker.setRotation(rotation);
        this.map.addOverlay(marker);
        this.arrowOverlays.push(marker);
      }
      /**
       * 清除箭头
       */

    }, {
      key: "clearArrows",
      value: function clearArrows() {
        var _this = this;

        this.arrowOverlays.forEach(function (overlay) {
          _this.map.removeOverlay(overlay);
        });
        this.arrowOverlays = [];
      }
      /**
       * 设置箭头可见性
       * @param visible 可见性
       */

    }, {
      key: "setArrowsVisible",
      value: function setArrowsVisible(visible) {
        this.arrowOverlays.forEach(function (overlay) {
          if (visible) {
            overlay.show();
          } else {
            overlay.hide();
          }
        });
      }
      /**
       * 更新箭头数据
       * @param newData 新箭头数据
       */

    }, {
      key: "updateData",
      value: function updateData(newData) {
        this.data = newData;
        this.parseLineData();
        this.clearArrows();
        this.dispatchArrows();
      }
      /**
       * 经纬度坐标转屏幕坐标
       * @param lng 经度
       * @param lat 纬度
       */

    }, {
      key: "pointToPixel",
      value: function pointToPixel(lng, lat) {
        var pixel;

        switch (this.mapType) {
          case 'BMap':
            pixel = this.map.pointToPixel(new BMap.Point(lng, lat));
            break;

          case 'BMapGL':
            pixel = this.map.pointToPixel(new BMapGL.Point(lng, lat));
            break;

          default:
            console.log("\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u5730\u56FE\u6784\u9020\u51FD\u6570\uFF1A['BMap','BMapGL']\u4E2D\u7684\u4E00\u79CD\uFF01");
            break;
        }

        return pixel;
      }
      /**
      * 屏幕坐标转经纬度坐标
      * @param x 屏幕坐标x
      * @param y 屏幕坐标y
      */

    }, {
      key: "pixelToPoint",
      value: function pixelToPoint(x, y) {
        var point;

        switch (this.mapType) {
          case 'BMap':
            point = this.map.pixelToPoint(new BMap.Pixel(x, y));
            break;

          case 'BMapGL':
            point = this.map.pixelToPoint(new BMapGL.Pixel(x, y));
            break;

          default:
            console.log("\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u5730\u56FE\u6784\u9020\u51FD\u6570\uFF1A['BMap','BMapGL']\u4E2D\u7684\u4E00\u79CD\uFF01");
            break;
        }

        return point;
      }
      /**
       * 创建marker
       * @param icon 图标
       * @param point 坐标点
       */

    }, {
      key: "createMarker",
      value: function createMarker(point) {
        var myIcon;
        var marker;

        switch (this.mapType) {
          case 'BMap':
            myIcon = new BMap.Icon(this.icon, new BMap.Size(this.iconSize.x, this.iconSize.y));
            marker = new BMap.Marker(point, {
              icon: myIcon
            });
            break;

          case 'BMapGL':
            myIcon = new BMapGL.Icon(this.icon, new BMapGL.Size(this.iconSize.x, this.iconSize.y));
            marker = new BMapGL.Marker(point, {
              icon: myIcon
            });
            break;

          default:
            console.log("\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u5730\u56FE\u6784\u9020\u51FD\u6570\uFF1A['BMap','BMapGL']\u4E2D\u7684\u4E00\u79CD\uFF01");
            break;
        }

        return marker;
      }
      /**
      * 析构函数
      */

    }, {
      key: "destory",
      value: function destory() {
        this.clearArrows();
        this.map.removeEventListener('moveend', this.moveendHandlerFunc);
        this.map.removeEventListener('zoomend', this.zoomendHandlerFunc);
      }
    }]);

    return PolylineArrows;
  }();

  return PolylineArrows;

})));
//# sourceMappingURL=bmap-polylinearrows.js.map
