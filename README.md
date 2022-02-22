A BMap plug-in to define and draw patterns on existing Polylines or along coordinate paths.

百度地图线路自定义方向箭头插件，支持BMap和BMapGL两个版本

![](https://github.com/felix0917/bmap-polylinearrows/readme/readme.png)


### Usage

###### BMapGL

```js
let map = new BMapGL.Map('container'); 
map.centerAndZoom(new BMapGL.Point(121.5149319, 31.268328), 17); 
map.enableScrollWheelZoom(true); 

let data = {
    geometry: {
        "type": "MultiLineString",
            "coordinates": [
                [
                    [
                        121.50259791977119,
                        31.234271035048522
                    ],
                    [
                        121.5028609436245,
                        31.234037681240462
                    ]
                ]
            ]
    }
}

let pts = [];
data.geometry.coordinates[0].forEach(coor => {
    pts.push(new BMapGL.Point(coor[0], coor[1]));
})
let polyline = new BMapGL.Polyline(pts, {
     strokeColor: 'blue',
     strokeWeight: 10,
     strokeOpacity: 0.6
});
map.addOverlay(polyline);

let icon = createSingleArrowIcon()
let polylineArrows = new PolylineArrows('BMapGL', map, data, icon, { correctAngle: 90 });
```

### BMap

```
just replace BMapGL to BMap
```

### Developing

###### **build**

```js
npm run build 
npm run build-min
```

###### **examples**

```js
npm run start & http://localhost:3000
```

## API

###### PolylineArrows constructor options:

| Property            | Type        | Required | Description                                                  |
| ------------------- | ----------- | -------- | ------------------------------------------------------------ |
| `mapType`           | String      | Yes      | 'BMap' or 'BMapGL'.｜支持'BMap'和'BMapGL'两种字符串传入      |
| `map`               | Object      | Yes      | Map instantiation object.｜地图实例化对象                    |
| `data`              | GeoJSON     | Yes      | Polyline data in geojson format.｜GeoJSON格式的线数据        |
| `icon`              | String      | Yes      | Icon for arrow.｜箭头图标                                    |
| `opts`              | *see below* | No       | Options for PolylineArrows. ｜绘制箭头可选项                 |
| `opts.step`         | Number      | No       | Arrow spacing.｜箭头之间的间隔，单位为px                     |
| `opts.iconSize`     | Number      | No       | Arrow icon size.｜箭头图标大小，单位为px                     |
| `opts.correctAngle` | Number      | No       | Arrow icon correction angle.After your icon is corrected, the front of the icon should be aligned horizontally to the right.｜箭头图标矫正角度，你的图标需要满足正前方水平朝右，不满足需要矫正 |

