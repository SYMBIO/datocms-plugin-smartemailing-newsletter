import React, { Component } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import './style.css';

const stringify = (o) => JSON.stringify(o, undefined, '  ');
const FROM_FIELD = 'from';
const TO_FIELD = 'to';
const ITEMS_FIELD = 'items';

const STATE_NEW = 'new';
// const STATE_CONNECTED = 'connected';
// const STATE_SENT = 'sent';

export default class Main extends Component {
  constructor(props) {
    super(props);

    this.state = {
      fieldValue: this.getFieldValue(),
      from: props.plugin.getFieldValue(FROM_FIELD),
      to: props.plugin.getFieldValue(TO_FIELD),
      items: props.plugin.getFieldValue(`${ITEMS_FIELD}.${props.plugin.locale}`),
    };
  }

  componentDidMount() {
    const { plugin } = this.props;
    const { fieldValue } = this.state;

    if (!fieldValue) {
      plugin.setFieldValue(plugin.fieldPath, stringify({ state: STATE_NEW }));
    }

    // toggleField(fieldPath, this.runCondition(condition));

    plugin.addFieldChangeListener(plugin.fieldPath, () => {
      this.updateFieldValue();
    });

    plugin.addFieldChangeListener(FROM_FIELD, () => {
      this.setState({
        from: plugin.getFieldValue(FROM_FIELD),
      });
    });

    plugin.addFieldChangeListener(TO_FIELD, () => {
      this.setState({
        to: plugin.getFieldValue(TO_FIELD),
      });
    });

    plugin.addFieldChangeListener(ITEMS_FIELD, () => {
      this.setState({
        items: plugin.getFieldValue(`${ITEMS_FIELD}.${plugin.locale}`),
      });
    });
  }

  getFieldValue() {
    const { plugin } = this.props;
    return JSON.parse(plugin.getFieldValue(plugin.fieldPath)) || { state: STATE_NEW };
  }

  updateFieldValue() {
    this.setState({
      fieldValue: this.getFieldValue(),
    });
  }

  async updateFromSE() {
    const { plugin } = this.props;
    const { fieldValue } = this.state;

    const { data } = await axios.post('/api/update', {
      username: plugin.parameters.global.username,
      apiKey: plugin.parameters.global.api_key,
    });

    const newFieldValue = { ...fieldValue, se: data };

    plugin.setFieldValue(plugin.fieldPath, newFieldValue);
  }

  render() {
    // const { plugin } = this.props;
    const {
      fieldValue, from, to, items,
    } = this.state;

    // const items = getFieldValue(`${ITEMS_FIELD}.${locale}`);

    const showLoadButton = !!(from && to);
    const hasItems = Array.isArray(items) && items.length > 0;

    return (
      <div className="container">
        {fieldValue.state === STATE_NEW && (
        <>
          {!showLoadButton && !hasItems && <strong>Zvolte termíny nebo ručně vyberte položky</strong>}
          {showLoadButton && (
          <button
            type="button"
            className="DatoCMS-button DatoCMS-button--primary"
          >
            {hasItems ? 'Nahradit' : 'Načíst'}
            {' '}
            položky dle zvolených termínů
          </button>
          )}
          {showLoadButton && !hasItems && <> ... nebo vyberte položky ručně</>}
        </>
        )}
        <pre>
          {JSON.stringify(items)}
          {JSON.stringify(fieldValue)}
        </pre>
      </div>
    );
  }
}

Main.propTypes = {
  plugin: PropTypes.object.isRequired,
};
