import type { Schema, Struct } from '@strapi/strapi';

export interface BusinessListingsAvitoProfile extends Struct.ComponentSchema {
  collectionName: 'components_business_listings_avito_profiles';
  info: {
    description: 'Avito business profile data';
    displayName: 'Avito Profile';
    icon: 'shopping-bag';
  };
  attributes: {
    activeListingsCount: Schema.Attribute.Integer;
    activeSince: Schema.Attribute.Date;
    address: Schema.Attribute.String;
    averageRating: Schema.Attribute.Decimal;
    categories: Schema.Attribute.JSON;
    companyName: Schema.Attribute.String;
    contactPerson: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    lastSynced: Schema.Attribute.DateTime;
    phoneNumber: Schema.Attribute.String;
    profileId: Schema.Attribute.String & Schema.Attribute.Required;
    profileUrl: Schema.Attribute.String;
    reviewsCount: Schema.Attribute.Integer;
  };
}

export interface BusinessListingsTwoGisProfile extends Struct.ComponentSchema {
  collectionName: 'components_business_listings_two_gis_profiles';
  info: {
    description: '2GIS business listing data';
    displayName: '2GIS Profile';
    icon: 'map-pin';
  };
  attributes: {
    address: Schema.Attribute.String;
    averageRating: Schema.Attribute.Decimal;
    categories: Schema.Attribute.JSON;
    city: Schema.Attribute.String;
    companyName: Schema.Attribute.String;
    coordinates: Schema.Attribute.Component<'common.geo-location', false>;
    lastSynced: Schema.Attribute.DateTime;
    listingId: Schema.Attribute.String & Schema.Attribute.Required;
    phone: Schema.Attribute.String;
    photos: Schema.Attribute.JSON;
    reviewsCount: Schema.Attribute.Integer;
    website: Schema.Attribute.String;
    workingHours: Schema.Attribute.JSON;
  };
}

export interface CommonContactPerson extends Struct.ComponentSchema {
  collectionName: 'components_common_contact_persons';
  info: {
    description: 'Company contact person';
    displayName: 'Contact Person';
    icon: 'user';
  };
  attributes: {
    email: Schema.Attribute.Email;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    phone: Schema.Attribute.String;
    position: Schema.Attribute.String;
    social: Schema.Attribute.Component<'common.social-links', false>;
  };
}

export interface CommonGeoLocation extends Struct.ComponentSchema {
  collectionName: 'components_common_geo_locations';
  info: {
    description: 'Geographic coordinates';
    displayName: 'Geo Location';
    icon: 'location-arrow';
  };
  attributes: {
    latitude: Schema.Attribute.Float & Schema.Attribute.Required;
    longitude: Schema.Attribute.Float & Schema.Attribute.Required;
  };
}

export interface CommonSocialLinks extends Struct.ComponentSchema {
  collectionName: 'components_common_social_links';
  info: {
    description: 'Social media profile links';
    displayName: 'Social Links';
    icon: 'link';
  };
  attributes: {
    instagram: Schema.Attribute.String;
    telegram: Schema.Attribute.String;
    twitter: Schema.Attribute.String;
    vk: Schema.Attribute.String;
    whatsapp: Schema.Attribute.String;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
  };
}

export interface SocialProfilesInstagramPost extends Struct.ComponentSchema {
  collectionName: 'components_social_profiles_instagram_posts';
  info: {
    description: 'Instagram post data';
    displayName: 'Instagram Post';
    icon: 'image';
  };
  attributes: {
    caption: Schema.Attribute.Text;
    commentsCount: Schema.Attribute.Integer;
    likesCount: Schema.Attribute.Integer;
    mediaType: Schema.Attribute.Enumeration<
      ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM']
    >;
    mediaUrl: Schema.Attribute.String;
    permalink: Schema.Attribute.String;
    postId: Schema.Attribute.String & Schema.Attribute.Required;
    timestamp: Schema.Attribute.DateTime;
  };
}

export interface SocialProfilesInstagramProfile extends Struct.ComponentSchema {
  collectionName: 'components_social_profiles_instagram_profiles';
  info: {
    description: 'Instagram business profile data';
    displayName: 'Instagram Profile';
    icon: 'instagram';
  };
  attributes: {
    biography: Schema.Attribute.Text;
    businessCategory: Schema.Attribute.String;
    businessEmail: Schema.Attribute.Email;
    businessPhoneNumber: Schema.Attribute.String;
    externalUrl: Schema.Attribute.String;
    followersCount: Schema.Attribute.Integer;
    followingCount: Schema.Attribute.Integer;
    fullName: Schema.Attribute.String;
    isBusinessAccount: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    isPrivate: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isVerified: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    lastSynced: Schema.Attribute.DateTime;
    postsCount: Schema.Attribute.Integer;
    profilePicUrl: Schema.Attribute.String;
    recentPosts: Schema.Attribute.Component<
      'social-profiles.instagram-post',
      true
    > &
      Schema.Attribute.SetMinMax<
        {
          max: 12;
        },
        number
      >;
    userId: Schema.Attribute.String;
    username: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'business-listings.avito-profile': BusinessListingsAvitoProfile;
      'business-listings.two-gis-profile': BusinessListingsTwoGisProfile;
      'common.contact-person': CommonContactPerson;
      'common.geo-location': CommonGeoLocation;
      'common.social-links': CommonSocialLinks;
      'shared.media': SharedMedia;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
      'social-profiles.instagram-post': SocialProfilesInstagramPost;
      'social-profiles.instagram-profile': SocialProfilesInstagramProfile;
    }
  }
}
