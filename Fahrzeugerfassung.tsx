import React, { Fragment, useEffect, useState } from 'react';
import GridCellWrapper from '../../../components/grid-cell-wrapper/GridCellWrapper';
import Toolbar from '../../../components/toolbar/Toolbar';

import { connect } from 'react-redux';
import Button from '../../../components/button/Button';
import { RouteComponentProps, useLocation, withRouter } from 'react-router-dom';
import {
  StateModel,
  StateModelFahrzeugerfassung,
  StateModelStammdaten,
} from '../../../models/StateModel';
import { getTranslation } from '../../../utils/translation/translationUtils';
import { TranslationKey } from '../../../utils/translation/TranslationKey';
import GenericModal from '../../../components/modal/GenericModal';
import Select, { SelectOption } from '../../../components/select/Select';
import {
  nameof,
  replaceIdlessWithUndefined,
} from '../../../utils/object-utils';
import {
  AdresseVersionDto,
  AnredeDto,
  FahrzeugDto,
  FahrzeugtypDto,
  PersonalDto,
  PersonalVersionDto,
  PersonalVersionSummaryDto,
} from '../../../api';
import Textarea from '../../../components/input/floating-label/textarea/Textarea';
import { MIN_DATE } from '../../../utils/constants';
import { isoDateToDate } from '../../../utils/date';
import {
  checkIfFuhrparkcodeExists,
  createFahrzeug,
  getFahrzeugById,
  getFahrzeugCopy,
  resetFahrzeugerfassung,
  setFahrzeugerfassungField,
  updateFahrzeug,
} from './action/fahrzeugerfassung';
import { getFahrzeugtypen } from './action/fahrzeugtypen';
import { toSelectOptions } from '../../../components/table/table-cell/select/TableCellSelectModel';
import FloatInput from '../../../components/input/floating-label/input-field/FloatInput';
import { searchKompatibleFahrzeuge } from '../fuhrparkmanagement/action/fahrzeug';
import { AutocompleteFormatPersonal } from '../auftragserfassung/adresse/search/AutocompleteFormatPersonal';
import { searchPersonalSummary } from '../personalmanagement/action/personal';
import { searchAdresseversionen } from '../../../redux/adresseversion/action/adresseversion';
import { AutocompleteFormatAdresseversion } from '../auftragserfassung/adresse/search/AutocompleteFormatAdresseversion';
import { getAufbautypen } from './action/aufbautyp';
import { getAntriebsarten } from './action/antriebsart';
import Fahrzeugeigenschaften from './fahrzeugeigenschaften/Fahrzeugeigenschaften';
import { FahrzeugeigenschaftModel } from '../../../models/FahrzeugeigenschaftModel';
import { setValidationTip } from '../../../utils/notification-utils';
import Form from '../../../components/form/Form';
import { navigate } from '../../../utils/navigation-utils';
import { ROUTE_FUHRPARKMANAGEMENT } from '../../../routing/browser-routes';
import { focuslistFahrzeugerfassung } from '../../../utils/focus/focus-lists';
import { setFocusListAndFocusElement } from '../../../redux/main/action/focus';
import TextInput from '../../../components/input/floating-label/input-field/TextInput';
import PhoneInput from '../../../components/input/floating-label/input-field/PhoneInput';
import DateInput from '../../../components/input/floating-label/input-field/DateInput';
import AutocompleteText from '../../../components/input/floating-label/input-field/AutocompleteText';
import { Search } from '../../../components/input/floating-label/search/Search';
import { isDateTimeEmailValid } from '../../../utils/validation-utils';

interface AuftragserfassungProps {
  fahrzeugerfassung: StateModelFahrzeugerfassung;
  stammdaten: StateModelStammdaten;
  resetPersonalerfassung: () => void;
  getFahrzeugById: (id: number) => void;
  getFahrzeugtypen: () => void;
  getAufbautypen: () => void;
  getAntriebsarten: () => void;
  setFahrzeugerfassungField: (
    value: string | number | boolean | undefined | { id: number | undefined },
    fieldName: string
  ) => void;
  searchKompatibleFahrzeuge: (
    fuhrparkcode: string,
    fahrzeugtypGruppeNummer: number
  ) => void;
  searchPersonalSummary: (nachname?: string) => void;
  searchAdresseversionen: (query?: string) => void;
  createFahrzeug: (fahrzeugDto: FahrzeugDto) => void;
  updateFahrzeug: (fahrzeugId: number, fahrzeugDto: FahrzeugDto) => void;
  resetFahrzeugerfassung: () => void;
  checkIfFuhrparkcodeExists: (username: string, fahrzeugId?: number) => void;
  setFocusListAndFocusElement: (
    listOfElementIds: string[],
    elementId: string
  ) => void;
  editedByUser: boolean;
  suchvorschlaege: [];
  getFahrzeugCopy: (id: number) => void;
}

/**
 * Auftragserfassung-Component
 * Dient zur Erfassung von Aufträgen.
 *
 * @returns {JSX.Element} Auftragserfassung-Component
 * @constructor
 */
const Fahrzeugerfassung = (
  props: AuftragserfassungProps & RouteComponentProps
) => {
  const schadstoffklassen: SelectOption[] = [
    { elementId: 1, id: 1, value: 'Euro 1' },
    { elementId: 2, id: 2, value: 'Euro 2' },
    { elementId: 3, id: 3, value: 'Euro 3' },
    { elementId: 4, id: 4, value: 'Euro 4' },
    { elementId: 5, id: 5, value: 'Euro 5' },
    { elementId: 6, id: 6, value: 'Euro 6b' },
    { elementId: 7, id: 7, value: 'Euro 6c' },
    { elementId: 8, id: 8, value: 'Euro 6d' },
    { elementId: 9, id: 9, value: 'Euro 7' },
  ];

  const [activeFuhrparktab, setActiveFuhrparktab] = useState(
    getTranslation(TranslationKey.ADMINISTRATIVE_DATEN)
  );
  const today = new Date(Date.now());
  const [showAbbrechen, setShowAbbrechen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fahrzeugId = location.pathname.split('/')[3];
    props.getFahrzeugtypen();
    props.getAufbautypen();
    props.getAntriebsarten();
    if (!!props.fahrzeugerfassung.fahrzeugKopieId) {
      props.getFahrzeugCopy(props.fahrzeugerfassung.fahrzeugKopieId);
      props.setFahrzeugerfassungField(undefined, 'fahrzeugKopieId');
    } else if (!!fahrzeugId) {
      props.getFahrzeugById(Number(fahrzeugId));
    } else {
      props.resetFahrzeugerfassung();
    }
    props.setFocusListAndFocusElement(
      focuslistFahrzeugerfassung,
      'fuhrparkdaten-fuhrparkcode'
    );
  }, []);

  useEffect(() => {
    props.setFahrzeugerfassungField(undefined, 'zugEinheit');
  }, [props.fahrzeugerfassung.fahrzeugtyp.gruppeNummer]);

  useEffect(() => {
    if (
      props.fahrzeugerfassung.exists != undefined &&
      props.fahrzeugerfassung.exists.id !== props.fahrzeugerfassung.id
    ) {
      setValidationTip(
        getTranslation(TranslationKey.FUHRPARKCODE_VERGEBEN),
        [],
        nameof<FahrzeugDto>('fuhrparkcode')
      );
    }
  }, [props.fahrzeugerfassung.exists]);

  const buildFahrzeugPayload = (): FahrzeugDto => {
    const fahrzeugeigenschaften: FahrzeugeigenschaftModel[] | undefined =
      props.fahrzeugerfassung.fahrzeugeigenschaften?.filter(
        (item: FahrzeugeigenschaftModel) => item.active
      );

    return {
      ...props.fahrzeugerfassung,
      fahrzeugeigenschaften: fahrzeugeigenschaften,
      eigentuemer: replaceIdlessWithUndefined(
        props.fahrzeugerfassung.eigentuemer
      ) as AdresseVersionDto,
      zugEinheit: replaceIdlessWithUndefined(
        props.fahrzeugerfassung.zugEinheit
      ) as FahrzeugDto,
      zugehoerigesPersonal: replaceIdlessWithUndefined(
        props.fahrzeugerfassung.zugehoerigesPersonal
      ) as PersonalVersionSummaryDto,
    };
  };

  const getFuhrparktabs = () => {
    return (
      <div className='fuhrpark-tabs-header'>
        <button
          onClick={() =>
            setActiveFuhrparktab(
              getTranslation(TranslationKey.ADMINISTRATIVE_DATEN)
            )
          }
          className={`${
            activeFuhrparktab ===
            getTranslation(TranslationKey.ADMINISTRATIVE_DATEN)
              ? 'active'
              : ''
          }`}
          title={getTranslation(TranslationKey.ADMINISTRATIVE_DATEN)}
        >
          {getTranslation(TranslationKey.ADMINISTRATIVE_DATEN)}
        </button>

        <button
          onClick={() =>
            setActiveFuhrparktab(
              getTranslation(TranslationKey.KAUFMAENNISCHE_DATEN)
            )
          }
          className={`${
            activeFuhrparktab ===
            getTranslation(TranslationKey.KAUFMAENNISCHE_DATEN)
              ? 'active'
              : ''
          }`}
          title={getTranslation(TranslationKey.KAUFMAENNISCHE_DATEN)}
        >
          {getTranslation(TranslationKey.KAUFMAENNISCHE_DATEN)}
        </button>
      </div>
    );
  };
  /**
   * Steuert die Schließung vom Modalen Fenster und leert den State der Felder.
   */
  const handleClose = () => {
    setShowAbbrechen(false);
  };

  const onSubmitHandler = () => {
    if (isDateTimeEmailValid()) {
      !!props.fahrzeugerfassung.id
        ? props.updateFahrzeug(
            props.fahrzeugerfassung.id,
            buildFahrzeugPayload()
          )
        : props.createFahrzeug(buildFahrzeugPayload());
    }
  };

  const autocompleteHandlerZugFuhrparkcode = (suchvorschlag: any) => {
    props.setFahrzeugerfassungField(
      suchvorschlag,
      nameof<FahrzeugDto>('zugEinheit')
    );
  };

  const autocompleteHandlerZugPersonal = (suchvorschlag: any) => {
    props.setFahrzeugerfassungField(
      suchvorschlag,
      nameof<FahrzeugDto>('zugehoerigesPersonal')
    );
  };

  const autocompleteHandlerEigentuemer = (suchvorschlag: any) => {
    props.setFahrzeugerfassungField(
      suchvorschlag,
      nameof<FahrzeugDto>('eigentuemer')
    );
  };

  const setFuhrparkcode = (value: string) => {
    props.setFahrzeugerfassungField(value, nameof<FahrzeugDto>('fuhrparkcode'));
    value && props.checkIfFuhrparkcodeExists(value);
  };

  const fahrzeugerfassungAbbrechen = () => {
    navigate(location.pathname, ROUTE_FUHRPARKMANAGEMENT, handleClose);
  };

  const handleCancel = () => {
    if (!props.editedByUser) {
      fahrzeugerfassungAbbrechen();
    } else {
      setShowAbbrechen(true);
    }
  };

  return (
    <Fragment>
      <div className='wrapper-fuhrparkerfassung'>
        <Form classes={'wrapper-fuhrparkerfassung-form'}>
          <Toolbar>
            <Button
              tooltip={getTranslation(TranslationKey.SPEICHERN)}
              key={0}
              classes={'iconButton'}
              onClickHandler={onSubmitHandler}
            >
              <i className='far fa-save fa-2x' />
            </Button>
            <Button
              tooltip={getTranslation(TranslationKey.ABBRECHEN)}
              classes={'iconButton'}
              key={1}
              onClickHandler={handleCancel}
            >
              <i className='fas fa-times fa-2x color-red' />
            </Button>
          </Toolbar>
          <div className='status'>
            <div className={'datum-gesperrt'}>
              <span>
                {getTranslation(TranslationKey.ANGELEGT_AM)}:{' '}
                <strong>
                  {today.toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </span>
              <span className={'gesperrt'}>
                {getTranslation(TranslationKey.GESPERRT)} &nbsp;
                <input
                  checked={props.fahrzeugerfassung?.gesperrt}
                  onChange={event =>
                    props.setFahrzeugerfassungField(
                      event.target.checked,
                      nameof<FahrzeugDto>('gesperrt')
                    )
                  }
                  type='checkbox'
                />
              </span>
            </div>
          </div>
          <GridCellWrapper
            classes='fuhrparkdaten'
            label={getTranslation(TranslationKey.FUHRPARKDATEN)}
          >
            <div className={'fuhrparkdaten-wrapper'}>
              <div className={'fuhrparkcode-kennenzeichen'}>
                <TextInput
                  id={'fuhrparkdaten-fuhrparkcode'}
                  label={getTranslation(TranslationKey.FUHRPARKCODE)}
                  name='fuhrparkcode'
                  classes='fuhrparkcode'
                  onChangeHandler={value => setFuhrparkcode(value)}
                  value={props.fahrzeugerfassung?.fuhrparkcode}
                />
                <TextInput
                  id={'fuhrparkdaten-kennzeichen'}
                  label={getTranslation(TranslationKey.KENNZEICHEN)}
                  name='kennenzeichen'
                  classes='kennenzeichen'
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('kennzeichen')
                    )
                  }
                  value={props.fahrzeugerfassung.kennzeichen}
                />
              </div>
              <div className={'fahrzeugtyp-aufbautyp'}>
                <Select
                  id={'fahrzeugtyp'}
                  className='fahrzeugtyp'
                  headerTitle={getTranslation(TranslationKey.FAHRZEUGTYP)}
                  selectedOptionId={props.fahrzeugerfassung?.fahrzeugtyp?.id}
                  name={'fahrzeugtyp.id'}
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value
                        ? props.stammdaten.fahrzeugtypen.find(
                            f => f.id === value
                          )
                        : undefined,
                      nameof<FahrzeugDto>('fahrzeugtyp')
                    )
                  }
                  selectData={toSelectOptions(
                    props.stammdaten?.fahrzeugtypen,
                    'bezeichnung',
                    false
                  )}
                  filterList
                />
                <Select
                  id={'aufbautyp'}
                  className='aufbautyp'
                  headerTitle={getTranslation(TranslationKey.AUFBAUTYP)}
                  selectedOptionId={props.fahrzeugerfassung?.aufbautyp?.id}
                  name={
                    nameof<PersonalDto>('validVersion') +
                    '.' +
                    nameof<PersonalVersionDto>('anrede') +
                    '.' +
                    nameof<AnredeDto>('id')
                  }
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value ? { id: value } : undefined,
                      nameof<FahrzeugDto>('aufbautyp')
                    )
                  }
                  selectData={toSelectOptions(
                    props.stammdaten?.aufbautypen,
                    'bezeichnung',
                    true
                  )}
                  filterList
                />
              </div>
              <div className={'zgfuhrparkcode-fahrzeugtelefon'}>
                <AutocompleteText
                  readonly={
                    props.fahrzeugerfassung.fahrzeugtyp?.gruppeNummer ===
                    undefined
                  }
                  id={'fuhrparkdaten-zugehoeriger-fuhrparkcode'}
                  value={
                    props.fahrzeugerfassung.zugEinheit?.id
                      ? props.fahrzeugerfassung.zugEinheit.fuhrparkcode
                      : String(props.fahrzeugerfassung?.zugEinheit ?? '')
                  }
                  onChangeHandler={value => {
                    if (value !== '')
                      props.fahrzeugerfassung.fahrzeugtyp.gruppeNummer &&
                        props.searchKompatibleFahrzeuge(
                          value,
                          props.fahrzeugerfassung.fahrzeugtyp.gruppeNummer
                        );
                    props.setFahrzeugerfassungField(value, 'zugEinheit');
                  }}
                  label={getTranslation(
                    TranslationKey.ZUGEHOERIGER_FUHRPARKCODE
                  )}
                  name='zugEinheit'
                  classes='zgfuhrparkcode'
                  autocompleteFormat={
                    <Search
                      suchvorschlag={props.suchvorschlaege}
                      displayedFields={[
                        nameof<FahrzeugDto>('kennzeichen'),
                        nameof<FahrzeugDto>('fahrzeugtyp') +
                          '.' +
                          nameof<FahrzeugtypDto>('bezeichnung'),
                      ]}
                    />
                  }
                  autocompleteHandler={autocompleteHandlerZugFuhrparkcode}
                  suchvorschlaege={props.suchvorschlaege}
                />
                <PhoneInput
                  id={'fuhrparkdaten-fahrzeugtelefonnr'}
                  label={getTranslation(TranslationKey.FAHRZEUG_TELEFON)}
                  name='fahrzeugtelefon'
                  classes='fahrzeugtelefon'
                  onValueChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('fahrzeugtel')
                    )
                  }
                  value={props.fahrzeugerfassung.fahrzeugtel}
                />
              </div>
              <AutocompleteText
                id={'fuhrparkdaten-zugehoeriger-fahrpersonal'}
                value={
                  props.fahrzeugerfassung.zugehoerigesPersonal?.id
                    ? props.fahrzeugerfassung.zugehoerigesPersonal?.nachname
                    : String(
                        props.fahrzeugerfassung?.zugehoerigesPersonal ?? ''
                      )
                }
                onChangeHandler={value => {
                  if (value !== '') props.searchPersonalSummary(value);
                  props.setFahrzeugerfassungField(
                    value,
                    'zugehoerigesPersonal'
                  );
                }}
                label={getTranslation(TranslationKey.ZUGEHOERIGES_PERSONAL)}
                name='zugehoerigesPersonal'
                classes='zgPersonal'
                autocompleteFormat={<AutocompleteFormatPersonal />}
                autocompleteHandler={autocompleteHandlerZugPersonal}
                suchvorschlaege={props.suchvorschlaege}
              />
              <div className={'anwendertextfeld'}>
                <TextInput
                  id={'fuhrparkdaten-anwebdertextfeld1'}
                  label={getTranslation(TranslationKey.ANWENDERTEXTFELD) + ' 1'}
                  name='anwendertextfeld-1'
                  classes='anwendertextfeld-1'
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('anwendertextfeld1')
                    )
                  }
                  value={props.fahrzeugerfassung.anwendertextfeld1}
                />
                <TextInput
                  id={'fuhrparkdaten-anwebdertextfeld2'}
                  label={getTranslation(TranslationKey.ANWENDERTEXTFELD) + ' 2'}
                  name='anwendertextfeld-2'
                  classes='anwendertextfeld-2'
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('anwendertextfeld2')
                    )
                  }
                  value={props.fahrzeugerfassung.anwendertextfeld2}
                />
              </div>
              <TextInput
                id={'fuhrparkdaten-anwebdertextfeld3'}
                label={getTranslation(TranslationKey.ANWENDERTEXTFELD) + ' 3'}
                name='anwendertextfeld-3'
                classes='anwendertextfeld-3'
                onChangeHandler={value =>
                  props.setFahrzeugerfassungField(
                    value,
                    nameof<FahrzeugDto>('anwendertextfeld3')
                  )
                }
                value={props.fahrzeugerfassung.anwendertextfeld3}
              />
              <div className='kfz-bild'>Bild vom Fahrzeug</div>
              <Fahrzeugeigenschaften />
            </div>
          </GridCellWrapper>
          <GridCellWrapper
            classes='technischedaten'
            label={getTranslation(TranslationKey.TECHNISCHE_DATEN)}
          >
            <div className={'technischedaten-wrapper'}>
              <div className={'gesamtgewicht-eigengewicht-nutzlast'}>
                <FloatInput
                  id={'technische-daten-zulaessiges-gesamtgewicht'}
                  label={getTranslation(
                    TranslationKey.ZULAESSIGES_GESAMTGEWICHT_KG
                  )}
                  name={nameof<FahrzeugDto>('zulGesamtgewicht')}
                  classes='gesamtgewicht'
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('zulGesamtgewicht')
                    )
                  }
                  value={
                    props.fahrzeugerfassung?.zulGesamtgewicht?.toString() ?? ''
                  }
                />
                <FloatInput
                  id={'technische-daten-eigengewicht'}
                  label={getTranslation(TranslationKey.EIGENGEWICHT_KG)}
                  name='eigengewicht'
                  classes='eigengewicht'
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('eigengewicht')
                    )
                  }
                  value={
                    props.fahrzeugerfassung?.eigengewicht?.toString() ?? ''
                  }
                />
                <FloatInput
                  id={'technische-daten-nutzlast'}
                  label={getTranslation(TranslationKey.NUTZLAST_KG)}
                  name='nutzlast'
                  classes='nutzlast'
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('nutzlast')
                    )
                  }
                  value={props.fahrzeugerfassung.nutzlast?.toString() ?? ''}
                />
              </div>
              <div className={'laenge-breite-hoehe'}>
                <FloatInput
                  id={'technische-daten-innenmass-laenge'}
                  label={getTranslation(TranslationKey.INNENMASS_LAENGE_M)}
                  name='laenge'
                  classes='laenge'
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('laenge')
                    )
                  }
                  value={props.fahrzeugerfassung?.laenge?.toString() ?? ''}
                />
                <FloatInput
                  id={'technische-daten-innenmass-bereite'}
                  label={getTranslation(TranslationKey.INNENMASS_BREITE_M)}
                  name='breite'
                  classes='breite'
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('breite')
                    )
                  }
                  value={props.fahrzeugerfassung?.breite?.toString() ?? ''}
                />
                <FloatInput
                  id={'technische-daten-innenmass-hoehe'}
                  label={getTranslation(TranslationKey.INNENMASS_HOEHE_M)}
                  name='hoehe'
                  classes='hoehe'
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('hoehe')
                    )
                  }
                  value={props.fahrzeugerfassung?.hoehe?.toString() ?? ''}
                />
              </div>
              <div className={'volumen-stellplatz-lademeter'}>
                <FloatInput
                  id={'technische-daten-volumen'}
                  label={getTranslation(TranslationKey.VOLUMEN_M3)}
                  name='volumen'
                  classes='volumen'
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('volumen')
                    )
                  }
                  value={props.fahrzeugerfassung.volumen?.toString() ?? ''}
                />
                <FloatInput
                  id={'technische-daten-stellplaetze'}
                  label={getTranslation(TranslationKey.STELLPLAETZE)}
                  name='stellplatz'
                  classes='stellplatz'
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('stellplaetze')
                    )
                  }
                  value={props.fahrzeugerfassung.stellplaetze?.toString() ?? ''}
                />
                <FloatInput
                  id={'technische-daten-lademeter'}
                  label={getTranslation(TranslationKey.LADEMETER)}
                  name='lademeter'
                  classes='lademeter'
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('lademeter')
                    )
                  }
                  value={props.fahrzeugerfassung?.lademeter?.toString() ?? ''}
                />
              </div>

              <div className={'achsenanzahl-schadstoffklasse-antriebsart'}>
                <FloatInput
                  id={'technische-daten-achsenanzahl'}
                  label={getTranslation(TranslationKey.ACHSENANZAHL)}
                  name='laenge'
                  classes='laenge'
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value,
                      nameof<FahrzeugDto>('achsenanzahl')
                    )
                  }
                  value={
                    props.fahrzeugerfassung?.achsenanzahl?.toString() ?? ''
                  }
                />
                <Select
                  id={'technische-daten-schadstoffklasse'}
                  className='schadstoffklasse'
                  headerTitle={getTranslation(TranslationKey.SCHADSTOFFKLASSE)}
                  selectedOptionId={
                    props.fahrzeugerfassung?.schadstoffklasse?.id
                  }
                  name={
                    nameof<PersonalDto>('validVersion') +
                    '.' +
                    nameof<PersonalVersionDto>('anrede') +
                    '.' +
                    nameof<AnredeDto>('id')
                  }
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value ? { id: value } : undefined,
                      nameof<FahrzeugDto>('schadstoffklasse')
                    )
                  }
                  selectData={toSelectOptions(schadstoffklassen, 'value', true)}
                  filterList
                />
                <Select
                  id={'technische-daten-antriebsart'}
                  className='antriebsart'
                  headerTitle={getTranslation(TranslationKey.ANTRIEBSART)}
                  selectedOptionId={props.fahrzeugerfassung?.antriebsart?.id}
                  name={
                    nameof<PersonalDto>('validVersion') +
                    '.' +
                    nameof<PersonalVersionDto>('anrede') +
                    '.' +
                    nameof<AnredeDto>('id')
                  }
                  onChangeHandler={value =>
                    props.setFahrzeugerfassungField(
                      value ? { id: value } : undefined,
                      nameof<FahrzeugDto>('antriebsart')
                    )
                  }
                  selectData={toSelectOptions(
                    props.stammdaten?.antriebsarten,
                    'bezeichnung',
                    true
                  )}
                  filterList
                />
              </div>
              <Textarea
                id={'technische-daten-hinweisfeld'}
                label={getTranslation(TranslationKey.HINWEISFELD)}
                maxLength={200}
                name={'hinweisfeld'}
                classes={'hinweisfeld'}
                value={props.fahrzeugerfassung?.hinweis ?? ''}
                onChangeHandler={value =>
                  props.setFahrzeugerfassungField(
                    value,
                    nameof<FahrzeugDto>('hinweis')
                  )
                }
              />
            </div>
          </GridCellWrapper>
          <GridCellWrapper classes='fuhrparktabs' label={getFuhrparktabs()}>
            {activeFuhrparktab ===
              getTranslation(TranslationKey.ADMINISTRATIVE_DATEN) && (
              <div className={'administrative-daten-wrapper'}>
                <div className={'eigentuemer-kraftfahrzeugschein'}>
                  <AutocompleteText
                    id={'admin-daten-eigentuemer'}
                    value={
                      props.fahrzeugerfassung?.eigentuemer?.matchcode ?? ''
                    }
                    onChangeHandler={value => {
                      if (value !== '') props.searchAdresseversionen(value);
                      props.setFahrzeugerfassungField(
                        value,
                        'eigentuemerMatchcode'
                      );
                    }}
                    label={getTranslation(TranslationKey.EIGENTUEMER)}
                    name={nameof<FahrzeugDto>('eigentuemer')}
                    classes='eigentuemer'
                    autocompleteFormat={<AutocompleteFormatAdresseversion />}
                    autocompleteHandler={autocompleteHandlerEigentuemer}
                    suchvorschlaege={props.suchvorschlaege}
                  />
                  <TextInput
                    id={
                      'admin-daten-kraftfahrzeugscheun/zulassungsbescheinigung'
                    }
                    label={
                      getTranslation(TranslationKey.KRAFTFAHRZEUGSCHEIN) +
                      '/' +
                      getTranslation(TranslationKey.ZULASSUNGSBESCHEINIGUNG)
                    }
                    name='kraftfahrzeugschein'
                    classes='kraftfahrzeugschein'
                    onChangeHandler={value =>
                      props.setFahrzeugerfassungField(
                        value,
                        nameof<FahrzeugDto>('fahrzeugschein')
                      )
                    }
                    value={props.fahrzeugerfassung.fahrzeugschein}
                  />
                </div>
                <div className={'hauptuntersuchung-bis-versicherungkarte'}>
                  <DateInput
                    id={'admin-daten-tuev-bis'}
                    label={getTranslation(
                      TranslationKey.TUEV_HAUPTUNTERSUCHUNG_BIS
                    )}
                    classes='hauptuntersuchung-bis'
                    minDate={MIN_DATE}
                    onChangeHandler={value =>
                      props.setFahrzeugerfassungField(
                        value,
                        nameof<FahrzeugDto>('tuevBis')
                      )
                    }
                    value={isoDateToDate(props.fahrzeugerfassung.tuevBis) ?? ''}
                  />
                  <TextInput
                    id={'admin-daten-gruene-versicherungskarte'}
                    label={getTranslation(
                      TranslationKey.GRUENE_VERSICHERUNGSKARTE
                    )}
                    name='versicherungskarte'
                    classes='versicherungskarte'
                    onChangeHandler={value =>
                      props.setFahrzeugerfassungField(
                        value,
                        nameof<FahrzeugDto>('grueneVerskarte')
                      )
                    }
                    value={props.fahrzeugerfassung.grueneVerskarte}
                  />
                </div>
                <div className={'eu-lizenz-bis-anhaengerschein'}>
                  <DateInput
                    id={'admin-daten-eu-lizenz-bis'}
                    label={getTranslation(TranslationKey.EU_LIZENZ_GUELTIG_BIS)}
                    classes='eu-lizenz-bis'
                    minDate={MIN_DATE}
                    onChangeHandler={value =>
                      props.setFahrzeugerfassungField(
                        value,
                        nameof<FahrzeugDto>('euLizenzBis')
                      )
                    }
                    value={
                      isoDateToDate(props.fahrzeugerfassung?.euLizenzBis) ?? ''
                    }
                  />
                  <TextInput
                    id={'admin-daten-anhaengerschein'}
                    label={getTranslation(TranslationKey.ANHAENGERSCHEIN)}
                    name='anhaengerschein'
                    classes='anhaengerschein'
                    onChangeHandler={value =>
                      props.setFahrzeugerfassungField(
                        value,
                        nameof<FahrzeugDto>('anhaengerschein')
                      )
                    }
                    value={props.fahrzeugerfassung.anhaengerschein}
                  />
                </div>
              </div>
            )}
            {activeFuhrparktab ===
              getTranslation(TranslationKey.KAUFMAENNISCHE_DATEN) &&
              getTranslation(TranslationKey.KAUFMAENNISCHE_DATEN)}
          </GridCellWrapper>
        </Form>
      </div>
      <GenericModal
        show={showAbbrechen}
        closeHandler={handleClose}
        titel={getTranslation(TranslationKey.ABBRECHEN)}
        description={getTranslation(TranslationKey.FRAGE_BEARBEITUNG_ABBRECHEN)}
      >
        <div className='modal-btn-group'>
          <button
            className='modal-btn'
            onClick={() => fahrzeugerfassungAbbrechen()}
          >
            {getTranslation(TranslationKey.JA)}
          </button>
          <button className='modal-btn' onClick={() => handleClose()}>
            {getTranslation(TranslationKey.NEIN)}
          </button>
        </div>
      </GenericModal>
    </Fragment>
  );
};

const mapStateToProps = (state: StateModel) => ({
  fahrzeugerfassung: state.Fahrzeugerfassung,
  stammdaten: state.Stammdaten,
  editedByUser: state.Layout.editedByUser,
  suchvorschlaege: state.Suchvorschlaege.suchvorschlaege,
});

export default connect(mapStateToProps, {
  getFahrzeugById,
  getFahrzeugtypen,
  getAntriebsarten,
  getAufbautypen,
  setFahrzeugerfassungField,
  searchKompatibleFahrzeuge,
  searchPersonalSummary,
  searchAdresseversionen,
  createFahrzeug,
  updateFahrzeug,
  resetFahrzeugerfassung,
  checkIfFuhrparkcodeExists,
  setFocusListAndFocusElement,
  getFahrzeugCopy,
})(withRouter(Fahrzeugerfassung));
