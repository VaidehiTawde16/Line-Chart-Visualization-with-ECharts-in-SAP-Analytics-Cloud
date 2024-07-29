var getScriptPromisify = (src) => {
  return new Promise((resolve) => {
    $.getScript(src, resolve)
  })
}

//The below function extracts dimensions and measures from metadata and structures them into arrays and maps.
const parseMetadata = metadata => {
  const { dimensions: dimensionsMap, mainStructureMembers: measuresMap } = metadata
  const dimensions = []
  for (const key in dimensionsMap) {
    const dimension = dimensionsMap[key]
    dimensions.push({ key, ...dimension })
  }
  const measures = []
  for (const key in measuresMap) {
    const measure = measuresMap[key]
    measures.push({ key, ...measure })
  }
  return { dimensions, measures, dimensionsMap, measuresMap }
}

(function () {
  const prepared = document.createElement('template')
  prepared.innerHTML = `
        <style>
        </style>
        <div id="root" style="width: 100%; height: 100%;">
        </div>
      `
  class LineSamplePrepped extends HTMLElement {
    constructor() {
      super()

      this._shadowRoot = this.attachShadow({ mode: 'open' })
      this._shadowRoot.appendChild(prepared.content.cloneNode(true))

      this._root = this._shadowRoot.getElementById('root')

      this._props = {}

      this.render()
    }
    //Calls render when the widget is resized.
    onCustomWidgetResize(width, height) {
      this.render()
    }
    //Calls render when the widget is updated.
    onCustomWidgetAfterUpdate(changedProps) {
      this.render()
    }

    //This function performs linear regression on the input data and returns a predicted value for a given newInput.
    lr = (inputData, newInput) => {
      var data = []
      inputData.forEach(element => {
        data.push([parseInt(element["dimensions_0"].label), element["measures_0"].raw])
      });
      const x = data.map(d => d[0]);
      const y = data.map(d => d[1]);

      const linearRegression = ss.linearRegression(data);
      const linearRegressionLine = ss.linearRegressionLine(linearRegression);

      const predictedOutput = linearRegressionLine(newInput);
      const returnObj = {
        "dimensions_0": {
          "id": "[Date].[YHQMD].[Date.YEAR].[" + newInput + "]",
          "label": newInput.toString(),
          "parentId": "[Date].[YHQMD].[All].[(all)]",
          "isNode": true,
          "isCollapsed": true
        },
        "measures_0": {
          "raw": predictedOutput,
          "formatted": predictedOutput.toString(),
          "unit": "USD"
        }
      }

      return returnObj
    }

    async render() {
      const dataBinding = this.dataBinding
      if (!dataBinding || dataBinding.state !== 'success') { return }

      await getScriptPromisify(
        "https://cdnjs.cloudflare.com/ajax/libs/echarts/5.0.0/echarts.min.js"
      )

      await getScriptPromisify(
        "https://cdnjs.cloudflare.com/ajax/libs/simple-statistics/7.8.1/simple-statistics.min.js"
      )

      const { data, metadata } = dataBinding

      var op1 = this.lr(data, 2025)
      data.push(op1)
      var op2 = this.lr(data, 2026)
      data.push(op2)
      var op3 = this.lr(data, 2027)
      data.push(op3)

      const { dimensions, measures } = parseMetadata(metadata)
      // dimension
      const categoryData = []

      // measures
      const series = measures.map(measure => {
        return {
          data: [],
          key: measure.key,
          type: 'line',
          smooth: true
        }
      })
      debugger;
      data.forEach(row => {
        // dimension
        categoryData.push(dimensions.map(dimension => {
          return row[dimension.key].label
        }).join('/'))
        // measures
        series.forEach(series => {
          series.data.push(row[series.key].raw)
        })
      })

      const myChart = echarts.init(this._root, 'main')
      const option = {
        xAxis: {
          type: 'category',
          data: categoryData
        },
        yAxis: {
          type: 'value'
        },
        tooltip: {
          trigger: 'axis'
        },
        series
      }
      myChart.setOption(option)
    }
  }

  customElements.define('com-sap-sample-echarts-line_chart', LineSamplePrepped)
})()
