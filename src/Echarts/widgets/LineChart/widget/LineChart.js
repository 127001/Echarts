/*global logger, Snap, html, domStyle */
/*
    Echarts
    ========================

    @file      : Echarts.js
    @version   : 1.0.0
    @author    : Rob Duits
    @date      : 1/28/2016
    @copyright : Incentro 2016
    @license   : Apache 2

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/query",
  "dojo/on",
  "Echarts/lib/echarts",
  "Echarts/widgets/Core"
], function(declare, lang, domQuery, on, _echarts, _core) {
    "use strict";

    // Declare widget.
    return declare("Echarts.widgets.LineChart.widget.LineChart", [ _core ], {

      // Overwrite functions from _core here...

      _processData : function () {
        logger.debug(this.id + "._processData");
        var sets = [],
            points = null,
            set = {
                points : []
            },
            xlabels = [],
            xlabelsSet = false,
            color = "",
            highlightcolor = "",
            label = "",
            j = null,
            i = null,
            k = null,
            _set = null,
            maxpoints = 0;

            this._chartData.datasets = [];
            this._chartData.labels = [];
            sets = this._data.datasets = this._sortArrayObj(this._data.datasets);

            for (j = 0; j < sets.length; j++) {
                set = sets[j];
                if (set.points.length > maxpoints) {
                    maxpoints = set.points.length;
                }
            }

            for (j = 0; j < sets.length; j++) {
                set = sets[j];

                points = [];
                if (set.points.length === 0) {
                    for (k = 0; k < maxpoints; k++) {
                        points.push(0);
                    }
                    logger.debug(this.id + " - empty dataset");
                }

                //set.points = this._sortArrayMx(set.points, this.sortingxvalue);
                color = set.dataset.get(this.seriescolor);
                highlightcolor = set.dataset.get(this.serieshighlightcolor);

                label = set.dataset.get(this.datasetlabel);

                for (i = 0; i < set.points.length; i++) {
                    if (!xlabelsSet) {
                        xlabels.push(((this.scaleShowLabelsBottom === true) ? set.points[i].get(this.seriesxlabel) : ""));
                    }

                    points.push(+(set.points[i].get(this.seriesylabel))); // Convert to integer, so the stackedbar doesnt break!
                }

                if (!xlabelsSet) {
                    xlabelsSet = true;
                }

                var _bezier;
                try {
                    _bezier = parseFloat(this.bezierCurveTension);
                } catch (e) {
                    _bezier = 0.4;
                }

                _set = {
                    label : (this.scaleShowLabelsBottom === true) ? label : "",
                    backgroundColor: (this.seriesColorReduceOpacity) ? this._hexToRgb(color, "0.2") : color,
                    borderColor: (this.seriesColorReduceOpacity) ? this._hexToRgb(color, "0.5") : color,
                    pointColor: (this.seriesColorReduceOpacity) ? this._hexToRgb(color, "0.8") : color,
                    pointBorderColor: (this.seriesColorReduceOpacity) ? this._hexToRgb(color, "0.8") : color,
                    pointHoverBackgroundColor: (this.seriesColorReduceOpacity) ? this._hexToRgb(color, "0.75") : highlightcolor,
                    pointHoverBorderColor: (this.seriesColorReduceOpacity) ? this._hexToRgb(highlightcolor, "1") : highlightcolor,
                    data : points,
                    fill: this.seriescolorfilled,
                    tension : this.bezierCurve ? _bezier : 0
                };
                this._chartData.datasets.push(_set);
                this._activeDatasets.push({
                    dataset : _set,
                    idx : j,
                    active : true
                });
            }
            this._chartData.labels = xlabels;

            logger.debug(this.id + " Created LineChart data");
            logger.debug(this.id + "  " + JSON.stringify(this._chartData));

            this._createChart(this._chartData);

            this._createLegend(false);
      },

      _createChart : function (data) {
          logger.debug(this.id + "._createChart");


          // based ready dom, initialization echarts instance
          var myChart = _echarts.init(this.attachChart);

      		// Specify configurations and data graphs
      		var option = {
      	    title: {
      	      text: this.titleAttr,
      				left: "center"
      	    },
      			tooltip: {
      	      trigger: "item",
      	      formatter: "{a} <br/>{b} : {c}"
      	    },
      	    xAxis: {
      	      data: ["20-01","24-01","26-01","23-04","20-05","20-06"],
      				splitLine: {show: false}
      	    },
      	    yAxis: {
      				min: this.yAxisMinValueAttr,
      				max: this.yAxisMaxValueAttr,
      				splitLine: {show: false}
      			},
      			dataZoom: {
      		    type: "inside",
      				startValue: 0,
      		    start: 0,
      		    end: 100
      	    },
      	    series: [{
      	      name: "independent",
      	      type: "line",
      	      data: [0, 20, 36, 10, 10, 20],
      	      animationDuration: 1000,
      				smooth: true
      	    }]
      		};

          // Just use the specified configurations and data graphs.
          myChart.setOption(option);

          if (this._chart) {
              this._chart.stop();
              this._chart.data.datasets = data.datasets;
              this._chart.data.labels = data.labels;
              this._chart.update(1000);
          } else {
              logger.debug("stacked:" + this.isStacked);
              this._chart = new this._chartJS(this._ctx, {
                  type: "line",
                  data: data,
                  options: {
                      title: {
                          display: (this.chartTitle !== "") ? true : false,
                          text: (this.chartTitle !== "") ? this.chartTitle : "",
                          fontFamily: this._font,
                          fontSize: this.titleSize
                      },
                      scales : {
                          yAxes: [{
                              //If stacked is set to true, the Y-axis needs to be stacked for it to work
                              stacked: this.isStacked,
                              scaleLabel: {
                                  display: (this.yLabel !== "") ? true : false,
                                  labelString: (this.yLabel !== "") ? this.yLabel : "",
                                  fontFamily: this._font
                              },
                              ticks : { fontFamily: this._font,
                              callback: lang.hitch(this, function(value){
                                      var round = parseInt(this.roundY);
                                      if (!isNaN(round) && round >= 0) {
                                          return Number(value).toFixed(round);
                                      }
                                      return value;
                                  }) }
                          }],
                          xAxes: [{
                              scaleLabel: {
                                  display: (this.xLabel !== "") ? true : false,
                                  labelString: (this.xLabel !== "") ? this.xLabel : "",
                                  fontFamily: this._font
                              },
                              type: "category",
                              id: "x-axis-0",
                              ticks : { fontFamily: this._font, }
                          }]
                      },
                      responsive : this.responsive,
                      responsiveAnimationDuration : (this.responsiveAnimationDuration > 0 ? this.responsiveAnimationDuration : 0),
                      legend: {
                          display: this.showLegend,
                          labels : { fontFamily : this._font }
                      },

                      //Boolean - Whether to show labels on the scale
                      scaleShowLabels : this.scaleShowLabels,

                      ///Boolean - Whether grid lines are shown across the chart
                      scaleShowGridLines : this.scaleShowGridLines,

                      //String - Colour of the grid lines
                      scaleGridLineColor : this.scaleGridLineColor,

                      //Number - Width of the grid lines
                      scaleGridLineWidth : this.scaleGridLineWidth,

                      //Boolean - Whether to show horizontal lines (except X axis)
                      scaleShowHorizontalLines : this.scaleShowHorizontalLines,

                      //Boolean - Whether to show vertical lines (except Y axis)
                      scaleShowVerticalLines : this.scaleShowVerticalLines,

                      //Boolean - Whether or not to render as a stacked chart
                      stacked : this.isStacked,

                      //Boolean - Whether to show a dot for each point
                      pointDot : this.pointDot,

                      //Number - Radius of each point dot in pixels
                      pointDotRadius : this.pointDotRadius,

                      //Number - Pixel width of point dot stroke
                      pointDotStrokeWidth : this.pointDotStrokeWidth,

                      //Number - amount extra to add to the radius to cater for hit detection outside the drawn point
                      pointHitDetectionRadius : this.pointHitDetectionRadius,

                      //Boolean - Whether to show a stroke for datasets
                      datasetStroke : this.datasetStroke,

                      //Number - Pixel width of dataset stroke
                      datasetStrokeWidth : this.datasetStrokeWidth,

                      //Boolean - Whether to fill the dataset with a colour
                      datasetFill : this.datasetFill,

                      legendCallback : this._legendCallback,

                      //The scale line width
                      scaleLineWidth : this.scaleLineWidth,

                      //The scale line color
                      scaleLineColor : this.scaleLineColor,

                      // maintainAspectRatio
                      maintainAspectRatio : this.maintainAspectRatio,
                  }
              });

              this.connect(window, "resize", lang.hitch(this, function () {
                  this._resize();
              }));

              // Add class to determain chart type
              this._addChartClass("chartjs-line-chart");

              if (this.onclickmf) {
                  on(this._chart.chart.canvas, "click", lang.hitch(this, this._onClickChart));
              }
          }
      },
  });
});
require(["Echarts/widgets/LineChart/widget/LineChart"], function() {
    "use strict";
});
