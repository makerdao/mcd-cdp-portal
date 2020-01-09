import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Text,
  Flex,
  Card,
  Checkbox,
  Button,
  Link
} from '@makerdao/ui-components-core';
import useMaker from 'hooks/useMaker';
import useLanguage from 'hooks/useLanguage';
import { calcCDPParams } from 'utils/cdp';
import { mixpanelFactory } from 'utils/analytics';
import { formatCollateralizationRatio } from 'utils/ui';
import { etherscanLink } from 'utils/ethereum';
import { networkIdToName } from 'utils/network';
import ScreenFooter from '../ScreenFooter';
import ScreenHeader from '../ScreenHeader';
import { prettifyNumber } from 'utils/ui';
import { TxLifecycle } from 'utils/constants';
import styled from 'styled-components';
import { getColor } from '../../styles/theme';
import { ReactComponent as ExternalLinkIcon } from 'images/external-link.svg';

const { trackBtnClick } = mixpanelFactory(
  'Borrow',
  'VaultCreate',
  'ConfirmVault'
);

const StyledExternalLink = styled(ExternalLinkIcon)`
  path {
    stroke: ${props => props.color};
    fill: ${props => props.color};
  }
`;

const CDPCreateConfirmSummary = ({
  cdpParams,
  selectedIlk,
  capturedDispatch,
  enableSubmit,
  isFirstVault
}) => {
  const { lang } = useLanguage();
  const [hasReadTOS, setHasReadTOS] = useState(false);
  const [hasUnderstoodSF, setHasUnderstoodSF] = useState(false);

  const {
    liquidationPenalty,
    liquidationRatio,
    stabilityFee
  } = selectedIlk.data;
  const { gemsToLock, daiToDraw } = cdpParams;
  const { liquidationPrice, collateralizationRatio } = calcCDPParams({
    ilkData: selectedIlk.data,
    gemsToLock,
    daiToDraw
  });

  const rows = [
    [
      lang.verbs.depositing,
      `${prettifyNumber(cdpParams.gemsToLock)} ${selectedIlk.currency.symbol}`
    ],
    [lang.verbs.generating, `${prettifyNumber(cdpParams.daiToDraw)} DAI`],
    [
      lang.collateralization,
      formatCollateralizationRatio(collateralizationRatio)
    ],
    [lang.liquidation_ratio, `${liquidationRatio}%`],
    [lang.liquidation_price, `$${liquidationPrice.toFixed(2)}`],
    [lang.liquidation_penalty, `${liquidationPenalty}%`],
    [lang.stability_fee, `${stabilityFee}%`]
  ];
  return (
    <Box
      maxWidth="1040px"
      css={`
        margin: 0 auto;
      `}
    >
      <ScreenHeader title={lang.cdp_create.confirm_title} />
      <Card py={{ s: 'm', m: 'l' }} px={{ s: 'm', m: 'xl' }} my="l">
        <Grid>
          {rows.map(([title, value], index) => {
            return (
              <Grid
                key={title + value}
                mt={!!index && 's'}
                pt={!!index && 's'}
                gridTemplateColumns="5fr 1fr"
                justifyItems="start"
                borderTop={index !== 0 ? '1px solid' : null}
                color="grey.200"
              >
                <Text>{title}</Text>
                <Text
                  fontWeight="bold"
                  css="white-space: nowrap"
                  textAlign={'right'}
                >
                  {value}
                </Text>
              </Grid>
            );
          })}
        </Grid>
        <Grid
          justifyContent="center"
          mt="l"
          alignItems="center"
          gridRowGap="s"
          gridTemplateColumns="auto auto"
        >
          <Checkbox
            checked={hasReadTOS}
            onChange={() => {
              trackBtnClick('Terms', { isFirstVault });
              setHasReadTOS(state => !state);
            }}
          />
          <Text color="grey.500" ml="s">
            {lang.formatString(
              lang.terms_of_service_text,
              <Link href="/terms" target="_blank" color="blue">
                {lang.terms_of_service}
              </Link>
            )}
          </Text>
          <Checkbox
            checked={hasUnderstoodSF}
            onChange={() => setHasUnderstoodSF(state => !state)}
          />
          <Text color="grey.500" ml="s">
            {lang.cdp_create.has_understood_stability_fee}
          </Text>
        </Grid>
      </Card>
      <ScreenFooter
        canProgress={hasReadTOS && hasUnderstoodSF && enableSubmit}
        onNext={() => {
          trackBtnClick('Next', { isFirstVault });
          capturedDispatch({ type: 'increment-step' });
        }}
        onBack={() => {
          trackBtnClick('Back', { isFirstVault });
          capturedDispatch({ type: 'decrement-step' });
        }}
        continueText={lang.actions.create_cdp}
      />
    </Box>
  );
};

const CDPCreateConfirmed = ({ hash, isFirstVault, onClose, txState }) => {
  const { lang } = useLanguage();
  const { maker } = useMaker();
  const [waitTime, setWaitTime] = useState('8 minutes');

  const networkId = maker.service('web3').networkId();
  const isTestchain = ![1, 42].includes(networkId);
  useEffect(() => {
    (async () => {
      // this is the default transaction speed
      const waitTime = await maker.service('gas').getWaitTime('fast');
      const minutes = Math.round(waitTime);
      const seconds = Math.round(waitTime * 6) * 10;

      const waitTimeText =
        waitTime < 1
          ? `${seconds} ${lang.cdp_create.seconds_wait_time}`
          : `${minutes} ${
              minutes === 1
                ? lang.cdp_create.minutes_wait_time_singular
                : lang.minutes_wait_time_plural
            }`;

      setWaitTime(waitTimeText);
    })();
  });

  return (
    <Box
      maxWidth="1040px"
      css={`
        margin: 0 auto;
      `}
    >
      <ScreenHeader
        title={
          txState === TxLifecycle.CONFIRMED
            ? lang.cdp_create.post_confirmed_title
            : lang.cdp_create.confirmed_title
        }
        text={
          txState === TxLifecycle.CONFIRMED
            ? lang.cdp_create.post_confirmed_text
            : lang.formatString(lang.cdp_create.confirmed_text, waitTime)
        }
      />
      <Flex my="l" justifyContent="center">
        <Grid gridRowGap="s">
          <Box my="s" textAlign="center">
            {isTestchain ? (
              <Grid gridRowGap="s">
                <Text>{lang.cdp_create.tx_hash}</Text>
                <Text>{hash}</Text>
              </Grid>
            ) : (
              <Link
                target="_blank"
                href={etherscanLink(hash, networkIdToName(networkId))}
                onClick={() => {
                  trackBtnClick('TxDetails', { isFirstVault });
                }}
              >
                <Button variant="secondary">
                  <Text mr="xs">{lang.cdp_create.view_tx_details}</Text>
                  <StyledExternalLink color={getColor('steel')} ml="4px" />
                </Button>
              </Link>
            )}
          </Box>
          <Flex textAlign="center" justifyContent="center">
            <Button
              onClick={() => {
                trackBtnClick('Exit', { isFirstVault });
                onClose();
              }}
              width="145px"
            >
              {lang.exit}
            </Button>
          </Flex>
        </Grid>
      </Flex>
    </Box>
  );
};

const CDPCreateConfirmCDP = ({
  dispatch,
  cdpParams,
  selectedIlk,
  isFirstVault,
  onClose
}) => {
  const { lang } = useLanguage();
  const { maker, checkForNewCdps, newTxListener } = useMaker();
  const [enableSubmit, setEnableSubmit] = useState(true);

  const { gemsToLock, daiToDraw, txState } = cdpParams;

  const [openCDPTxHash, setOpenCDPTxHash] = useState(null);

  async function capturedDispatch(payload) {
    const { type } = payload;
    if (type !== 'increment-step') return dispatch(payload);

    const txObject = maker
      .service('mcd:cdpManager')
      .openLockAndDraw(
        selectedIlk.key,
        selectedIlk.currency(gemsToLock),
        daiToDraw
      );

    setEnableSubmit(false);
    newTxListener(txObject, lang.transactions.creating_cdp);

    const txMgr = maker.service('transactionManager');
    txMgr.listen(txObject, {
      pending: tx => setOpenCDPTxHash(tx.hash),
      confirmed: () => {
        checkForNewCdps();
        dispatch({ type: 'transaction-confirmed' });
      },
      error: () => setEnableSubmit(true)
    });
    await txMgr.confirm(txObject, 1);
  }

  if (openCDPTxHash)
    return (
      <CDPCreateConfirmed
        hash={openCDPTxHash}
        onClose={onClose}
        txState={txState}
      />
    );

  return (
    <CDPCreateConfirmSummary
      cdpParams={cdpParams}
      selectedIlk={selectedIlk}
      capturedDispatch={capturedDispatch}
      enableSubmit={enableSubmit}
      isFirstVault={isFirstVault}
    />
  );
};

export default CDPCreateConfirmCDP;
