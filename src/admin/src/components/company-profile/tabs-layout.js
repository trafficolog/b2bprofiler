import React from 'react';
import { Box, Tabs, Tab, TabPanel, TabPanels } from '@strapi/design-system';

const CompanyProfileTabsLayout = ({ children }) => {
  return (
    <Box padding={8}>
      <Tabs>
        <Tab>Основная информация</Tab>
        <Tab>Instagram</Tab>
        <Tab>2GIS</Tab>
        <Tab>Авито</Tab>
        
        <TabPanels>
          <TabPanel>
            {/* Основная информация компании */}
            {children.filter(child => 
              !['instagram', 'twoGis', 'avito'].includes(child.props.name)
            )}
          </TabPanel>
          
          <TabPanel>
            {/* Данные Instagram */}
            {children.filter(child => child.props.name === 'instagram')}
          </TabPanel>
          
          <TabPanel>
            {/* Данные 2GIS */}
            {children.filter(child => child.props.name === 'twoGis')}
          </TabPanel>
          
          <TabPanel>
            {/* Данные Авито */}
            {children.filter(child => child.props.name === 'avito')}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default CompanyProfileTabsLayout;