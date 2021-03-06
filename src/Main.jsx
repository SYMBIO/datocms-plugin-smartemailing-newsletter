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
              E-mail byl rozesl??n.
              <br />
              <br />
              <h2>
                Z??kladn?? statistiky
                <sup>1</sup>
                :
              </h2>

              {Array.isArray(fieldValue.contact_lists)
              && fieldValue.contact_lists.length > 0 && fieldValue.contact_lists[0] && (
              <dl>
                <dt>Rozesl??no na seznam</dt>
                <dd>{fieldValue.contact_lists[0].name}</dd>
              </dl>
              )}

              <dl>
                <dt>Za????tek rozes??l??n??</dt>
                <dd>{fieldValue.start}</dd>
              </dl>

              <dl>
                <dt>Konec rozes??l??n??</dt>
                <dd>{fieldValue.start}</dd>
              </dl>

              <dl>
                <dt>Odeslan??ch e-mail??</dt>
                <dd>{fieldValue.sent}</dd>
              </dl>

              <dl>
                <dt>Otev??en??ch e-mail??</dt>
                <dd>{fieldValue.opened}</dd>
              </dl>

              <dl>
                <dt>Rozkliknut??ch e-mail??</dt>
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
                Otev????t statistiky kampa??e ve SmartEmailingu
              </a>
            </p>
            <p className="mt-2">
              <em>
                <sup>1)</sup>
                Informace nemus?? b??t aktu??ln??, synchronizace se prov??d?? jednou za hodinu.
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
              E-mail je zalo??en ve SmartEmailingu, ale zat??m nebyl rozesl??n
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
                Otev????t e-mail ve SmartEmailingu
              </a>
            </p>
            <p className="mt-2">
              <em>
                <sup>1)</sup>
                Informace nemus?? b??t aktu??ln??, synchronizace se prov??d?? jednou za hodinu.
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
            {!showLoadButton && !hasItems && <strong>Zvolte term??ny nebo ru??n?? vyberte polo??ky</strong>}

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
                Na????st polo??ky dle zvolen??ch term??n??
              </button>
              {' '}
              ... nebo vyberte polo??ky ru??n??
            </>
            )}

            {hasItems && (
            <>
              <p>
                Polo??ky jsou vybr??ny (viz n????e), ale
                {' '}
                <strong>e-mail zat??m nen?? zalo??en</strong>
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
                  Zalo??it e-mail ve SmartEmailingu
                </button>
              </p>
              <p className="sameLine mt-2">
                a nebo m????ete
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
                  Smazat polo??ky a na????st znovu dle zvolen??ch term??n??
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
