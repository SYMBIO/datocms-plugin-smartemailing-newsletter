import React, { Component } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import './style.css';

const stringify = (o) => JSON.stringify(o, undefined, '  ');

const STATE_NEW = 'new';
const STATE_CREATED = 'created';
const STATE_SENT = 'sent';

export default class Main extends Component {
  constructor(props) {
    super(props);

    const { plugin } = props;

    this.state = {
      fieldValue: this.getFieldValue(),
      from: props.plugin.getFieldValue(plugin.parameters.instance.from_field),
      to: props.plugin.getFieldValue(plugin.parameters.instance.to_field),
      items: props.plugin.getFieldValue(`${plugin.parameters.instance.items_field}.${props.plugin.locale}`),
    };
  }

  componentDidMount() {
    const { plugin } = this.props;
    const { fieldValue } = this.state;

    if (!fieldValue) {
      plugin.setFieldValue(plugin.fieldPath, stringify({ state: STATE_NEW }));
    }

    plugin.toggleField(plugin.parameters.instance.from_field, fieldValue.state === STATE_NEW);
    plugin.toggleField(plugin.parameters.instance.to_field, fieldValue.state === STATE_NEW);
    plugin.toggleField(`${plugin.parameters.instance.items_field}.${plugin.locale}`, fieldValue.state === STATE_NEW);

    plugin.addFieldChangeListener(plugin.fieldPath, () => {
      this.updateFieldValue();
      plugin.toggleField(plugin.parameters.instance.from_field, fieldValue.state === STATE_NEW);
      plugin.toggleField(plugin.parameters.instance.to_field, fieldValue.state === STATE_NEW);
      plugin.toggleField(`${plugin.parameters.instance.items_field}.${plugin.locale}`, fieldValue.state === STATE_NEW);
    });

    plugin.addFieldChangeListener(plugin.parameters.instance.from_field, () => {
      this.setState({
        from: plugin.getFieldValue(plugin.parameters.instance.from_field),
      });
    });

    plugin.addFieldChangeListener(plugin.parameters.instance.to_field, () => {
      this.setState({
        to: plugin.getFieldValue(plugin.parameters.instance.to_field),
      });
    });

    plugin.addFieldChangeListener(plugin.parameters.instance.items_field, () => {
      this.setState({
        items: plugin.getFieldValue(`${plugin.parameters.instance.items_field}.${plugin.locale}`),
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

  async replaceItems() {
    const { plugin } = this.props;
    const { from, to } = this.state;

    const { data } = await axios.post('/api/items', {
      locale: plugin.locale,
      from,
      to,
    });

    plugin.setFieldValue(`${plugin.parameters.instance.items_field}.${plugin.locale}`, data.map((d) => d.id));
  }

  async createEmail() {
    const { plugin } = this.props;
    const { items } = this.state;

    const { data } = await axios.post('/api/create', {
      locale: plugin.locale,
      items: items.join(','),
      endpoint: plugin.parameters.instance.create_endpoint,
    });

    plugin.setFieldValue(plugin.fieldPath, stringify({ ...data, state: STATE_CREATED }));
    plugin.saveCurrentItem();
  }

  async updateFromSE() {
    const { plugin } = this.props;
    const { fieldValue } = this.state;

    const { data } = await axios.post('/api/update', {
      endpoint: plugin.parameters.instance.stats_endpoint,
    });

    const newFieldValue = { ...fieldValue, se: data };

    plugin.setFieldValue(plugin.fieldPath, newFieldValue);
  }

  render() {
    const {
      fieldValue, from, to, items,
    } = this.state;

    const showLoadButton = !!(from && to);
    const hasItems = Array.isArray(items) && items.length > 0;
    /* const debug = (
      <pre>
        {JSON.stringify(fieldValue, undefined, '  ')}
      </pre>
    ); */

    let output;

    switch (fieldValue.state) {
      case STATE_SENT: {
        output = (
          <>
            <p>
              E-mail byl rozeslán.
              <br />
              <br />
              <strong>
                Základní statistiky
                <sup>1</sup>
                :
              </strong>

              <dl>
                <dt>Začátek rozesílání</dt>
                <dd>{fieldValue.start}</dd>
              </dl>

              <dl>
                <dt>Konec rozesílání</dt>
                <dd>{fieldValue.start}</dd>
              </dl>

              <dl>
                <dt>Odeslaných e-mailů</dt>
                <dd>{fieldValue.sent}</dd>
              </dl>

              <dl>
                <dt>Otevřených e-mailů</dt>
                <dd>{fieldValue.opened}</dd>
              </dl>

              <dl>
                <dt>Rozkliknutých e-mailů</dt>
                <dd>{fieldValue.clicked}</dd>
              </dl>
            </p>
            <p>
              <a
                href={`https://app.smartemailing.cz/stats/newsletter/detail/${fieldValue.id}`}
                className="DatoCMS-button DatoCMS-button--primary mt-1"
                target="_blank"
                rel="noreferrer"
              >
                Otevřít statistiky kampaňe ve SmartEmailingu
              </a>
            </p>
            <p className="mt-2">
              <em>
                <sup>1)</sup>
                Informace nemusí být aktuální, synchronizace se provádí jednou za hodinu.
              </em>
            </p>
          </>
        );
        break;
      }

      case STATE_CREATED: {
        output = (
          <>
            <p>
              E-mail je založen ve SmartEmailingu, ale zatím nebyl rozeslán
              <sup>1</sup>
              .
            </p>
            <p>
              <a
                href={`https://app.smartemailing.cz/campaigns/emails/edit-in-editor/${fieldValue.emailId}`}
                className="DatoCMS-button DatoCMS-button--primary mt-1"
                target="_blank"
                rel="noreferrer"
              >
                Otevřít e-mail ve SmartEmailingu
              </a>
            </p>
            <p className="mt-2">
              <em>
                <sup>1)</sup>
                Informace nemusí být aktuální, synchronizace se provádí jednou za hodinu.
              </em>
            </p>
          </>
        );
        break;
      }
      case STATE_NEW:
      default: {
        output = (
          <>
            {!showLoadButton && !hasItems && <strong>Zvolte termíny nebo ručně vyberte položky</strong>}

            {showLoadButton && !hasItems && (
            <>
              <button
                type="button"
                className="DatoCMS-button DatoCMS-button--primary"
                onClick={(e) => {
                  e.target.setAttribute('disabled', 'disabled');
                  this.replaceItems().then(() => {
                    e.target.removeAttribute('disabled');
                  });
                }}
              >
                Načíst položky dle zvolených termínů
              </button>
              {' '}
              ... nebo vyberte položky ručně
            </>
            )}

            {hasItems && (
            <>
              <p>
                Položky jsou vybrány (viz níže), ale
                {' '}
                <strong>e-mail zatím není založen</strong>
              </p>
              <p>
                <button
                  type="button"
                  className="DatoCMS-button DatoCMS-button--primary DatoCMS-button--huge mt-1"
                  onClick={(e) => {
                    e.target.setAttribute('disabled', 'disabled');
                    this.createEmail().then(() => {
                      e.target.removeAttribute('disabled');
                    });
                  }}
                >
                  Založit e-mail ve SmartEmailingu
                </button>
              </p>
              <p className="sameLine mt-2">
                a nebo můžete
                {' '}
                <button
                  type="button"
                  className="DatoCMS-button DatoCMS-button--micro DatoCMS-button--alert ml-05"
                  onClick={(e) => {
                    e.target.setAttribute('disabled', 'disabled');
                    this.replaceItems().then(() => {
                      e.target.removeAttribute('disabled');
                    });
                  }}
                >
                  Smazat položky a načíst znovu dle zvolených termínů
                </button>
              </p>
            </>
            )}
          </>
        );
      }
    }

    return (
      <div className="container">
        {output}
      </div>
    );
  }
}

Main.propTypes = {
  plugin: PropTypes.object.isRequired,
};
